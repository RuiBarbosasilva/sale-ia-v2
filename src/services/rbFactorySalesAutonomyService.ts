import { prisma } from '../modules/mercadoLivre/lib/prisma';
import { rbFactorySalesAgentService } from './rbFactorySalesAgentService';
import { whatsappService } from './whatsappService';
import { websiteProspectorService } from './prospecting/websiteProspectorService';
import { websiteEnrichmentService } from './prospecting/websiteEnrichmentService';
import { websiteOpportunityScoringService } from './prospecting/websiteOpportunityScoringService';
import { websiteDemoFactoryService } from './prospecting/websiteDemoFactoryService';
import { websiteOutreachService } from './prospecting/websiteOutreachService';
import { RB_FACTORY_SALES_AUTONOMY, RbFactorySalesAutonomyMode } from '../config/rbFactorySalesAutonomy';

let initialized = false;
let runtimeTimer: ReturnType<typeof setInterval> | null = null;
let runtimeBusy = false;
const RUNTIME_INTERVAL_MS = Math.max(60_000, Number(process.env.RB_FACTORY_SELLER_INTERVAL_MS || 300_000));

function id(){ return crypto.randomUUID(); }
function safeLimit(value:any, fallback=10){ const n=Number(value); return Number.isFinite(n) ? Math.min(50,Math.max(1,n)) : fallback; }

const cycleProspectLocks = new Map<string, Promise<void>>();

async function withCycleProspectLock<T>(prospectId:string, work:()=>Promise<T>):Promise<T>{
  const previous=cycleProspectLocks.get(prospectId)||Promise.resolve();
  let release!:()=>void;
  const current=new Promise<void>(resolve=>{release=resolve;});
  cycleProspectLocks.set(prospectId,current);
  await previous;
  try{return await work();}finally{release();if(cycleProspectLocks.get(prospectId)===current) cycleProspectLocks.delete(prospectId);}
}

async function init(){
  if(initialized) return;
  await (prisma as any).$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "RbFactorySalesAutonomyRun" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "prospectId" TEXT,
      "conversationId" TEXT,
      "actionId" TEXT,
      "action" TEXT NOT NULL,
      "status" TEXT NOT NULL,
      "reason" TEXT,
      "metadata" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS "idx_RbFactorySalesAutonomyRun_prospect" ON "RbFactorySalesAutonomyRun"("prospectId");
    CREATE INDEX IF NOT EXISTS "idx_RbFactorySalesAutonomyRun_created" ON "RbFactorySalesAutonomyRun"("createdAt");
    CREATE TABLE IF NOT EXISTS "RbFactorySalesAutonomyControl" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'STOPPED',
      "config" TEXT,
      "startedAt" DATETIME,
      "stoppedAt" DATETIME,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    INSERT OR IGNORE INTO "RbFactorySalesAutonomyControl" ("id","status") VALUES ('singleton','STOPPED');
    DELETE FROM "RbFactorySalesAutonomyRun" WHERE "createdAt" < DATETIME('now', '-90 days');
  `);
  initialized=true;
}

async function audit(input:any){
  await init();
  const row=[id(),input.prospectId||null,input.conversationId||null,input.actionId||null,String(input.action||'UNKNOWN'),String(input.status||'BLOCKED'),input.reason||null,input.metadata?JSON.stringify(input.metadata):null];
  await (prisma as any).$executeRawUnsafe('INSERT INTO "RbFactorySalesAutonomyRun" ("id","prospectId","conversationId","actionId","action","status","reason","metadata") VALUES (?,?,?,?,?,?,?,?)',...row);
  return row[0];
}

function businessHours(){
  const hour=new Date().getHours();
  return hour>=RB_FACTORY_SALES_AUTONOMY.businessHoursStart && hour<RB_FACTORY_SALES_AUTONOMY.businessHoursEnd;
}

async function outboundToday(){
  await init();
  const row=(await (prisma as any).$queryRawUnsafe(`SELECT COUNT(*) count FROM "SalesAction" WHERE status='SENT' AND date(sentAt)=date('now')`))[0];
  return Number(row?.count||0);
}

async function recentOutbound(conversationId:string){
  const rows=await (prisma as any).$queryRawUnsafe(`SELECT sentAt FROM "SalesAction" WHERE conversationId=? AND status='SENT' AND sentAt IS NOT NULL ORDER BY sentAt DESC LIMIT 1`,conversationId);
  if(!rows[0]?.sentAt) return false;
  return Date.now()-new Date(rows[0].sentAt).getTime() < RB_FACTORY_SALES_AUTONOMY.minHoursBetweenOutbound*3600000;
}

function whatsappAutoSendEnabled(){
  return RB_FACTORY_SALES_AUTONOMY.mode==='AUTONOMOUS'
    && process.env.RB_FACTORY_WHATSAPP_AUTOSEND === 'true'
    && process.env.RB_FACTORY_WHATSAPP_OUTREACH_AUTHORIZED === 'true'
    && Boolean(process.env.EVOLUTION_API_KEY);
}

function canAutonomouslyPrepare(){
  return RB_FACTORY_SALES_AUTONOMY.mode!=='SUPERVISED';
}

function shouldEscalate(action:any){
  const payload=typeof action?.payload==='string' ? (()=>{try{return JSON.parse(action.payload)}catch{return {}}})() : (action?.payload||{});
  const confidence=Number(payload.confidence||0);
  const text=String(payload.reply||'');
  const risky=/(desconto|contrato|reclamação|reclamacao|processo|indeniza|cancelamento|jurídic|juridic|garantia especial)/i.test(text);
  return (RB_FACTORY_SALES_AUTONOMY.requireHumanForUncertainAI && confidence>0 && confidence<RB_FACTORY_SALES_AUTONOMY.minConfidenceForAutonomous) || risky;
}

async function controlRow(){ await init(); return (await (prisma as any).$queryRawUnsafe('SELECT * FROM "RbFactorySalesAutonomyControl" WHERE id=\'singleton\' LIMIT 1'))[0]; }

async function runRuntimeCycle(){
  if(runtimeBusy) return;
  const control=await controlRow();
  if(control?.status!=='RUNNING') return;
  runtimeBusy=true;
  try{
    const cfg=control.config?JSON.parse(control.config):{};
    await rbFactorySalesAutonomyService.discoverAndQualify(cfg);
    const cycle=await rbFactorySalesAutonomyService.cycle(Number(cfg.batchSize||10));
    await audit({action:'RUNTIME_CYCLE',status:'COMPLETED',reason:'SELLER_RUNNING',metadata:{cycle}});
  }catch(error:any){ await audit({action:'RUNTIME_CYCLE',status:'ERROR',reason:String(error?.message||error)}); }
  finally{runtimeBusy=false;}
}

function ensureRuntimeTimer(){ if(runtimeTimer) return; runtimeTimer=setInterval(()=>void runRuntimeCycle(),RUNTIME_INTERVAL_MS); }

export const rbFactorySalesAutonomyService = {
  async start(input:any={}){
    await init();
    const config={
      city:String(input.city||process.env.RB_FACTORY_SELLER_CITY||'Poços de Caldas'),
      state:String(input.state||process.env.RB_FACTORY_SELLER_STATE||'MG').toUpperCase(),
      niches:Array.isArray(input.niches)?input.niches.map(String).filter(Boolean):String(input.niches||process.env.RB_FACTORY_SELLER_NICHES||'clínicas,hamburguerias,restaurantes,advogados,odontologia').split(',').map((x:string)=>x.trim()).filter(Boolean),
      maxResults:Number(input.maxResults||process.env.RB_FACTORY_SELLER_MAX_RESULTS||10),batchSize:Number(input.batchSize||process.env.RB_FACTORY_SELLER_BATCH_SIZE||10)
    };
    await (prisma as any).$executeRawUnsafe('UPDATE "RbFactorySalesAutonomyControl" SET status=\'RUNNING\',config=?,startedAt=CURRENT_TIMESTAMP,stoppedAt=NULL,updatedAt=CURRENT_TIMESTAMP WHERE id=\'singleton\'',JSON.stringify(config));
    ensureRuntimeTimer();
    void runRuntimeCycle();
    return {status:'RUNNING',config,intervalMs:RUNTIME_INTERVAL_MS};
  },
  async stop(){
    await init();
    await (prisma as any).$executeRawUnsafe('UPDATE "RbFactorySalesAutonomyControl" SET status=\'STOPPED\',stoppedAt=CURRENT_TIMESTAMP,updatedAt=CURRENT_TIMESTAMP WHERE id=\'singleton\'');
    return {status:'STOPPED'};
  },
  async status(){ const row=await controlRow(); return {status:row?.status||'STOPPED',config:row?.config?JSON.parse(row.config):{},startedAt:row?.startedAt||null,stoppedAt:row?.stoppedAt||null,runtimeIntervalMs:RUNTIME_INTERVAL_MS}; },
  async bootstrap(){ const row=await controlRow(); ensureRuntimeTimer(); if(row?.status==='RUNNING') void runRuntimeCycle(); return this.status(); },
  async discoverAndQualify(config:any={}){
    const city=String(config.city||'Poços de Caldas'), state=String(config.state||'MG').toUpperCase();
    const niches=Array.isArray(config.niches)?config.niches:[]; const maxResults=Math.min(20,Math.max(1,Number(config.maxResults||10)));
    const results:any[]=[];
    for(const niche of niches){
      try{
        const found=await websiteProspectorService.searchProspects({city,state,niche,maxResults});
        const prospects=await websiteProspectorService.getProspects({city,state,niche,limit:maxResults,opportunityOnly:true});
        for(const p of prospects.slice(0,maxResults)){
          try{
            await websiteEnrichmentService.enrichProspect(p.id);
            await websiteOpportunityScoringService.calculateScore(p.id);
            const fresh=await prisma.websiteProspect.findUnique({where:{id:p.id}});
            if(fresh?.demoStatus!=='READY' && fresh?.demoStatus!=='APPROVED'){
              try{ await websiteDemoFactoryService.generateDemoForProspect(p.id,{useAI:true}); }catch{}
            }
            const afterDemo=await prisma.websiteProspect.findUnique({where:{id:p.id}});
            if(afterDemo?.email && process.env.RB_FACTORY_EMAIL_AUTOSEND==='true'){
              try{ const prepared=await websiteOutreachService.prepareOutreach(p.id); if(prepared?.outreachId) await websiteOutreachService.sendOutreach(p.id); }catch{}
            }
            }
          }catch{}
        }
        results.push({niche,found:found.totalFound,created:found.totalCreated,audited:found.totalAudited,qualified:found.totalQualified});
      }catch(error:any){ results.push({niche,error:String(error?.message||error)}); }
    }
    return results;
  },
  async config(){
    await init();
    return {
      ...RB_FACTORY_SALES_AUTONOMY,
      businessHoursNow: businessHours(),
      modeDescription: RB_FACTORY_SALES_AUTONOMY.mode==='AUTONOMOUS'
        ? 'prepara automaticamente e pode avançar ações de baixo risco; envio externo depende de canal autorizado'
        : RB_FACTORY_SALES_AUTONOMY.mode==='SEMI_AUTONOMOUS'
          ? 'prepara ações automaticamente e deixa o envio sob controle humano'
          : 'gera recomendações sem executar ações comerciais automaticamente'
    };
  },

  async sendAction(actionId:string){
    await init();
    const rows=await (prisma as any).$queryRawUnsafe('SELECT a.*,c.context FROM "SalesAction" a JOIN "SalesConversation" c ON c.id=a.conversationId WHERE a.id=? LIMIT 1',actionId);
    const action=rows[0];
    if(!action) throw new Error('SALES_ACTION_NOT_FOUND');
    if(action.status==='SENT') return {sent:true,reused:true,action};
    if(action.status==='SENDING'){
      const stale=(await (prisma as any).$queryRawUnsafe('SELECT id FROM "SalesAction" WHERE id=? AND status=\'SENDING\' AND datetime(updatedAt)<=datetime(\'now\',\'-10 minutes\') LIMIT 1',actionId))[0];
      if(!stale) throw new Error('SALES_ACTION_SEND_IN_PROGRESS');

      // The provider may have accepted the message even if our request timed out.
      // Never automatically resend an uncertain external side effect: doing so can
      // create duplicate WhatsApp messages. Move it to explicit operator review.
      await (prisma as any).$executeRawUnsafe(
        'UPDATE "SalesAction" SET status=\'SEND_REVIEW\',decisionNote=\'SEND_RESULT_UNKNOWN_PROVIDER_MAY_HAVE_ACCEPTED\',updatedAt=CURRENT_TIMESTAMP WHERE id=? AND status=\'SENDING\'',
        actionId
      );
      throw new Error('SALES_ACTION_SEND_RESULT_UNKNOWN_REVIEW_REQUIRED');
    }
    if(action.status!=='PENDING_APPROVAL' && action.status!=='APPROVED') throw new Error('SALES_ACTION_NOT_SENDABLE');
    if(!whatsappAutoSendEnabled()) throw new Error('WHATSAPP_AUTOSEND_NOT_CONFIGURED');
    const claimed=(await (prisma as any).$queryRawUnsafe('SELECT id FROM "SalesAction" WHERE id=? AND status IN (\'PENDING_APPROVAL\',\'APPROVED\') LIMIT 1',actionId))[0];
    if(!claimed) throw new Error('SALES_ACTION_SEND_IN_PROGRESS');
    let context:any={}; try{context=action.context?JSON.parse(action.context):{};}catch{}
    const phone=String(context?.prospect?.phone||'').replace(/\D/g,'');
    const payload=action.payload?JSON.parse(action.payload):{};
    const message=String(payload.reply||'').trim();
    if(!phone) throw new Error('LEAD_PHONE_REQUIRED');
    if(!message) throw new Error('SALES_MESSAGE_EMPTY');
    if(await recentOutbound(action.conversationId)) throw new Error('SALES_OUTBOUND_COOLDOWN');
    const exists=await whatsappService.checkNumber(phone);
    if(!exists) throw new Error('WHATSAPP_NUMBER_NOT_AVAILABLE');
    const claim=await (prisma as any).$executeRawUnsafe('UPDATE "SalesAction" SET status=\'SENDING\',updatedAt=CURRENT_TIMESTAMP WHERE id=? AND status IN (\'PENDING_APPROVAL\',\'APPROVED\')',actionId);
    if(claim!==1) throw new Error('SALES_ACTION_SEND_IN_PROGRESS');
    if(action.status==='PENDING_APPROVAL'){
      await (prisma as any).$executeRawUnsafe('UPDATE "SalesAction" SET status=\'SENDING\',updatedAt=CURRENT_TIMESTAMP WHERE id=? AND status=\'SENDING\'',actionId);
    }
    let providerResult:any;
    try{
      providerResult=await whatsappService.sendText(phone,message);
    }catch(error){
      await (prisma as any).$executeRawUnsafe('UPDATE "SalesAction" SET status=\'APPROVED\',decisionNote=?,updatedAt=CURRENT_TIMESTAMP WHERE id=? AND status=\'SENDING\'',String((error as any)?.message||'SEND_FAILED'),actionId);
      throw error;
    }
    const sent=await rbFactorySalesAgentService.markActionSent(actionId,{provider:'EVOLUTION_API',providerResult});
    await audit({prospectId:context?.prospect?.id||null,conversationId:action.conversationId,actionId,action:'OUTBOUND',status:'SENT',reason:'EVOLUTION_API'});
    return {sent:true,reused:false,action:sent,provider:'EVOLUTION_API'};
  },

  async cycle(limit=10){
    await init();
    const max= safeLimit(limit);
    const result:any={mode:RB_FACTORY_SALES_AUTONOMY.mode,startedAt:new Date().toISOString(),businessHours:businessHours(),processed:0,prepared:0,blocked:0,escalated:0,items:[]};

    if(!businessHours()){
      await audit({action:'CYCLE',status:'BLOCKED',reason:'OUTSIDE_BUSINESS_HOURS'});
      result.blocked=1;
      result.finishedAt=new Date().toISOString();
      return result;
    }

    const sentToday=await outboundToday();
    if(sentToday>=RB_FACTORY_SALES_AUTONOMY.maxDailyOutbound){
      await audit({action:'CYCLE',status:'BLOCKED',reason:'DAILY_OUTBOUND_LIMIT'});
      result.blocked=1;
      result.finishedAt=new Date().toISOString();
      return result;
    }

    const queue=await rbFactorySalesAgentService.sellerQueue(max);
    for(const item of queue){
      if(result.processed>=max) break;
      result.processed++;
      const cycleProspectId=String(item.prospectId);
      if(cycleProspectLocks.has(cycleProspectId)){
        result.items.push({prospectId:item.prospectId,status:'WAITING',reason:'PROSPECT_CYCLE_IN_PROGRESS'});
        continue;
      }
      try{
        const prepared=await withCycleProspectLock(cycleProspectId, async()=>rbFactorySalesAgentService.prepareNextSellerAction(cycleProspectId));
        if(!prepared?.available){
          result.items.push({prospectId:item.prospectId,status:'WAITING',reason:'NO_ACTION'});
          continue;
        }
        const action=prepared.action;
        const conversationId=prepared.conversationId||item.conversationId||null;

        if(action && conversationId && await recentOutbound(conversationId)){
          await audit({prospectId:item.prospectId,conversationId,actionId:action.id,action:'OUTBOUND',status:'BLOCKED',reason:'COOLDOWN'});
          result.blocked++;
          result.items.push({prospectId:item.prospectId,status:'BLOCKED',reason:'COOLDOWN'});
          continue;
        }

        if(prepared.followUp){
          if(!RB_FACTORY_SALES_AUTONOMY.autoPrepareFollowUps){
            result.blocked++;
            result.items.push({prospectId:item.prospectId,status:'BLOCKED',reason:'FOLLOW_UP_AUTOMATION_DISABLED'});
            continue;
          }
          await audit({prospectId:item.prospectId,conversationId,action:'FOLLOW_UP_PREPARE',status:'PREPARED',reason:'DUE_OR_QUEUE'});
          result.prepared++;
          result.items.push({prospectId:item.prospectId,status:'PREPARED_FOLLOW_UP',followUpId:prepared.followUp.id});
          continue;
        }

        if(action){
          const escalation=shouldEscalate(action);
          if(escalation){
            await audit({prospectId:item.prospectId,conversationId,actionId:action.id,action:'OUTBOUND',status:'ESCALATED',reason:'HUMAN_REVIEW_REQUIRED'});
            result.escalated++;
            result.items.push({prospectId:item.prospectId,status:'ESCALATED',actionId:action.id});
            continue;
          }

          if(!canAutonomouslyPrepare()){
            await audit({prospectId:item.prospectId,conversationId,actionId:action.id,action:'OUTBOUND',status:'BLOCKED',reason:'SUPERVISED_MODE'});
            result.blocked++;
            result.items.push({prospectId:item.prospectId,status:'BLOCKED',reason:'SUPERVISED_MODE',actionId:action.id});
            continue;
          }

          if(whatsappAutoSendEnabled()){
            try{
              const sent=await this.sendAction(action.id);
              result.items.push({prospectId:item.prospectId,status:'SENT',actionId:action.id,channel:'WHATSAPP',sent:true});
              result.prepared++;
              continue;
            }catch(sendError:any){
              await audit({prospectId:item.prospectId,conversationId,actionId:action.id,action:'OUTBOUND',status:'SEND_BLOCKED',reason:String(sendError?.message||sendError)});
            }
          }
          await audit({prospectId:item.prospectId,conversationId,actionId:action.id,action:'OUTBOUND',status:'PREPARED',reason:'AUTONOMY_ENGINE'});
          result.prepared++;
          result.items.push({prospectId:item.prospectId,status:'PREPARED_ACTION',actionId:action.id,requiresApproval:!whatsappAutoSendEnabled(),channel:'WHATSAPP'});
          continue;
        }

        result.items.push({prospectId:item.prospectId,status:'WAITING',reason:prepared.reason||'WAITING'});
      }catch(error:any){
        await audit({prospectId:item.prospectId,action:'CYCLE_ITEM',status:'ERROR',reason:String(error?.message||error)});
        result.items.push({prospectId:item.prospectId,status:'ERROR',reason:String(error?.message||error)});
      }
    }
    result.finishedAt=new Date().toISOString();
    return result;
  },

  async history(limit=50){
    await init();
    return (prisma as any).$queryRawUnsafe('SELECT * FROM "RbFactorySalesAutonomyRun" ORDER BY createdAt DESC LIMIT ?',safeLimit(limit,50));
  }
};
