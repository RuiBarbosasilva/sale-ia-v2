import { prisma } from '../modules/mercadoLivre/lib/prisma';
import { rbFactorySalesAgentService } from './rbFactorySalesAgentService';
import { whatsappService } from './whatsappService';
import { RB_FACTORY_SALES_AUTONOMY, RbFactorySalesAutonomyMode } from '../config/rbFactorySalesAutonomy';

let initialized = false;

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

export const rbFactorySalesAutonomyService = {
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
    if(action.status!=='PENDING_APPROVAL' && action.status!=='APPROVED') throw new Error('SALES_ACTION_NOT_SENDABLE');
    if(!whatsappAutoSendEnabled()) throw new Error('WHATSAPP_AUTOSEND_NOT_CONFIGURED');
    let context:any={}; try{context=action.context?JSON.parse(action.context):{};}catch{}
    const phone=String(context?.prospect?.phone||'').replace(/\D/g,'');
    const payload=action.payload?JSON.parse(action.payload):{};
    const message=String(payload.reply||'').trim();
    if(!phone) throw new Error('LEAD_PHONE_REQUIRED');
    if(!message) throw new Error('SALES_MESSAGE_EMPTY');
    if(await recentOutbound(action.conversationId)) throw new Error('SALES_OUTBOUND_COOLDOWN');
    const exists=await whatsappService.checkNumber(phone);
    if(!exists) throw new Error('WHATSAPP_NUMBER_NOT_AVAILABLE');
    if(action.status==='PENDING_APPROVAL') await rbFactorySalesAgentService.approveAction(actionId);
    const providerResult=await whatsappService.sendText(phone,message);
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

          await audit({prospectId:item.prospectId,conversationId,actionId:action.id,action:'OUTBOUND',status:'PREPARED',reason:'AUTONOMY_ENGINE'});
          result.prepared++;
          result.items.push({prospectId:item.prospectId,status:'PREPARED_ACTION',actionId:action.id,requiresApproval:true});
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
