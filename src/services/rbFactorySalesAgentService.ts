import { prisma } from '../modules/mercadoLivre/lib/prisma';
import { seniorSalesAgentService } from './seniorSalesAgentService';

const prospectLocks = new Map<string, Promise<void>>();

async function withProspectLock<T>(prospectId:string, work:()=>Promise<T>):Promise<T>{
  const previous=prospectLocks.get(prospectId)||Promise.resolve();
  let release!:()=>void;
  const current=new Promise<void>(resolve=>{release=resolve;});
  prospectLocks.set(prospectId,current);
  await previous;
  try{return await work();}finally{release();if(prospectLocks.get(prospectId)===current)prospectLocks.delete(prospectId);}
}

export const rbFactorySalesAgentService = {
  async context(prospectId:string){
    const prospect=await prisma.websiteProspect.findUnique({where:{id:prospectId}});
    if(!prospect) throw new Error('WEBSITE_PROSPECT_NOT_FOUND');
    const demo=await prisma.websiteDemo.findFirst({where:{prospectId,status:{in:['READY','APPROVED']}},orderBy:{version:'desc'}});
    const proposal=await prisma.websiteProposal.findFirst({where:{prospectId},orderBy:{id:'desc'}});
    const lead=prospect.linkedLeadId ? await prisma.lead.findUnique({where:{id:prospect.linkedLeadId}}) : null;
    const pipelineRows=await (prisma as any).$queryRawUnsafe('SELECT * FROM "RbFactorySalesPipeline" WHERE prospectId=? LIMIT 1',prospectId);
    const pipeline=pipelineRows[0]||null;
    let demoQualityScore: number | null = null;
    if (demo?.previewData) {
      try {
        const preview = JSON.parse(demo.previewData);
        demoQualityScore = Number.isFinite(Number(preview?.qualityReview?.overallScore))
          ? Number(preview.qualityReview.overallScore)
          : null;
      } catch {}
    }
    return {
      source:'RB_FACTORY_SITES', prospect:{id:prospect.id,companyName:prospect.companyName,segment:prospect.segment,city:prospect.city,state:prospect.state,phone:prospect.phone,email:prospect.email,currentWebsite:prospect.currentWebsite,websiteOpportunityStatus:prospect.websiteOpportunityStatus,websiteOpportunityScore:prospect.websiteOpportunityScore,priority:prospect.priority,status:prospect.status},
      demo:demo?{id:demo.id,version:demo.version,status:demo.status,qualityScore:demoQualityScore}:null,
      proposal:proposal?{id:proposal.id,status:proposal.status,content:proposal.content}:null,
      lead:lead?{id:lead.id,name:lead.name,stage:lead.stage,status:lead.status,score:lead.score}:null,
      pipeline:pipeline?{id:pipeline.id,stage:pipeline.stage,nextAction:pipeline.nextAction,priority:pipeline.priority}:null,
      salesRules:{neverInventPriceOrDeadline:true,neverCreateProjectBeforeAcceptedProposal:true,externalActionsRequireApproval:true}
    };
  },
  async ensureConversation(prospectId:string,channel='WHATSAPP'){
    const context=await this.context(prospectId);
    return withProspectLock(prospectId+':'+channel, async()=>{

    const rows=await (prisma as any).$queryRawUnsafe('SELECT * FROM "SalesConversation" WHERE channel=? AND context LIKE ? ORDER BY createdAt DESC LIMIT 1',channel,`%"id":"${prospectId}"%`);
    if(rows[0]) return {conversation:await seniorSalesAgentService.getConversation(rows[0].id),commercialContext:context,reused:true};
    const c=await seniorSalesAgentService.createConversation({channel,leadId:context.lead?.id||null,context});
    return {conversation:c,commercialContext:context,reused:false};
    });
  },
  async createConversation(prospectId:string,channel='WHATSAPP'){
    return this.ensureConversation(prospectId,channel);
  },
  async prepareInitialApproach(prospectId:string,channel='WHATSAPP'){
    const conversation=await this.ensureConversation(prospectId,channel);
    const existing=await (prisma as any).$queryRawUnsafe('SELECT * FROM "SalesAction" WHERE conversationId=? AND type=\'SEND_MESSAGE\' AND title=\'Enviar primeira abordagem comercial\' AND status IN (\'PENDING_APPROVAL\',\'APPROVED\',\'SENT\') ORDER BY createdAt DESC LIMIT 1',conversation.conversation.id);
    if(existing[0]) return {...conversation,draft:{conversationId:conversation.conversation.id,reused:true,action:existing[0],nextBestAction:'SEND_FIRST_APPROACH'}};
    const draft=await seniorSalesAgentService.prepareInitialApproach(conversation.conversation.id);
    return {...conversation,draft,reused:false};
  },
  async prepareProposalApproach(prospectId:string,channel='WHATSAPP'){
    const conversation=await this.ensureConversation(prospectId,channel);
    const draft=await seniorSalesAgentService.prepareProposalApproach(conversation.conversation.id);
    return {...conversation,draft};
  },
  async conversationHistory(prospectId:string,conversationId:string){
    const context=await this.context(prospectId);
    const conversation=await seniorSalesAgentService.getConversationHistory(conversationId);
    if(conversation.context){
      try{if(JSON.parse(conversation.context).prospect?.id!==prospectId) throw new Error('SALES_CONVERSATION_PROSPECT_MISMATCH');}
      catch(e:any){if(e?.message==='SALES_CONVERSATION_PROSPECT_MISMATCH') throw e;}
    }
    return {conversation,commercialContext:context};
  },
  async respond(prospectId:string,conversationId:string,message:string,eventKey?:string){
    if(eventKey){
      await (prisma as any).$executeRawUnsafe('CREATE TABLE IF NOT EXISTS "RbFactorySalesInboundEvent" ("eventKey" TEXT PRIMARY KEY NOT NULL, "prospectId" TEXT NOT NULL, "conversationId" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT \'PROCESSING\', "result" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)');
      try{
        await (prisma as any).$executeRawUnsafe('INSERT INTO "RbFactorySalesInboundEvent" ("eventKey","prospectId","conversationId","status") VALUES (?,?,?,\'PROCESSING\')',eventKey,prospectId,conversationId);
      }catch{
        const existing=(await (prisma as any).$queryRawUnsafe('SELECT * FROM "RbFactorySalesInboundEvent" WHERE eventKey=? LIMIT 1',eventKey))[0];
        if(existing?.status==='COMPLETED' && existing.result){
          try{return {...JSON.parse(existing.result),deduplicated:true};}catch{}
        }
        return {deduplicated:true,processing:true,prospectId,conversationId};
      }
    }
    try{
      const context=await this.context(prospectId);
      const conversation=await seniorSalesAgentService.getConversation(conversationId);
      if(conversation.context){
        try{if(JSON.parse(conversation.context).prospect?.id!==prospectId) throw new Error('SALES_CONVERSATION_PROSPECT_MISMATCH');}
        catch(e:any){if(e?.message==='SALES_CONVERSATION_PROSPECT_MISMATCH') throw e;}
      }
      const result=await seniorSalesAgentService.respond(conversationId,{message});
      await this.syncPipelineAfterResponse(prospectId,result,message);
      const explicitNoInterest=/(não tenho interesse|nao tenho interesse|não quero|nao quero|não me interessa|nao me interessa|pare de|pode parar|retire meu contato)/i.test(message);
      const terminal=explicitNoInterest || String(result?.nextBestAction||'')==='LOST';
      const followUp=terminal ? {reused:false,followUp:null,skipped:true,reason:'CUSTOMER_NOT_INTERESTED'} : await seniorSalesAgentService.scheduleRecommendedFollowUp(conversationId,result);
      const response={result,followUp,commercialContext:context};
      if(eventKey){
        await (prisma as any).$executeRawUnsafe('UPDATE "RbFactorySalesInboundEvent" SET "status"=\'COMPLETED\',"result"=? WHERE eventKey=?',JSON.stringify(response),eventKey);
      }
      return response;
    }catch(error){
      if(eventKey) await (prisma as any).$executeRawUnsafe('DELETE FROM "RbFactorySalesInboundEvent" WHERE eventKey=? AND status=\'PROCESSING\'',eventKey).catch(()=>{});
      throw error;
    }
  },
  async syncPipelineAfterResponse(prospectId:string,result:any,message?:string){
    const rows=await (prisma as any).$queryRawUnsafe('SELECT * FROM "RbFactorySalesPipeline" WHERE prospectId=? LIMIT 1',prospectId);
    const pipeline=rows[0];
    if(!pipeline) return null;
    const current=String(pipeline.stage);
    const nextAction=String(result?.nextBestAction||'FOLLOW_UP');
    const temperature=String(result?.temperature||'COLD');
    const intentScore=Number(result?.intentScore||0);
    const conversationText=String(message||result?.customerMessage||result?.message||'').toLowerCase();
    const explicitNoInterest=/(não tenho interesse|nao tenho interesse|não quero|nao quero|não me interessa|nao me interessa|pare de|pode parar|retire meu contato)/i.test(conversationText);
    let nextStage=current;
    if(['DISCOVERED','AUDITED','DEMO_READY','PROPOSAL_READY','CONTACTED'].includes(current) && (temperature==='HOT'||temperature==='VERY_HOT'||intentScore>=45)){
      nextStage='NEGOTIATION';
    }
    if(current==='CONTACTED' && nextAction==='ASK_FOR_CLOSE') nextStage='NEGOTIATION';
    if(explicitNoInterest) nextStage='LOST';
    if(current==='LOST' || current==='WON') nextStage=current;
    const safeActions=new Set(['ASK_FOR_CLOSE','INVESTIGATE_OBJECTION','DISCOVER_NEED','SEND_FIRST_APPROACH','REVIEW','PREPARE_DEMO','PREPARE_PROPOSAL','DISCOVER_DECISION_MAKER','FOLLOW_UP','ESCALATE_HUMAN_NEGOTIATION']);
    const normalizedAction=explicitNoInterest||nextStage==='LOST'||nextStage==='WON' ? (nextStage==='LOST'?'REVIEW':'FOLLOW_UP') : (safeActions.has(nextAction)?nextAction:'FOLLOW_UP');
    let notes:any={};
    try{notes=pipeline.notes?JSON.parse(pipeline.notes):{};}catch{notes={raw:pipeline.notes};}
    notes.salesAgent={temperature,intentScore,objection:result?.objection||null,confidence:Number(result?.confidence||0),updatedAt:new Date().toISOString()};
    if(explicitNoInterest) notes.salesAgent.outcome='EXPLICIT_NOT_INTERESTED';
    if(nextStage==='LOST' || nextStage==='WON') await this.closeSellerForProspect(prospectId,nextStage);
    await (prisma as any).$executeRawUnsafe(
      'UPDATE "RbFactorySalesPipeline" SET stage=?,nextAction=?,notes=?,updatedAt=CURRENT_TIMESTAMP WHERE prospectId=?',
      nextStage,normalizedAction,JSON.stringify(notes),prospectId
    );
    return {stage:nextStage,nextAction:normalizedAction};
  },
  async closeSellerForProspect(prospectId:string,outcome:'WON'|'LOST'){
    const rows=await (prisma as any).$queryRawUnsafe('SELECT id FROM "SalesConversation" WHERE context LIKE ? ORDER BY createdAt DESC', '%' + prospectId + '%');
    const results=[];
    for(const row of rows) results.push(await seniorSalesAgentService.closeConversationWork(row.id,outcome));
    return {prospectId,outcome,conversationsClosed:results.length,results};
  },
  async prepareActionChannel(actionId:string){ return seniorSalesAgentService.prepareActionChannel(actionId); },
  async approveAction(actionId:string){ return seniorSalesAgentService.approveAction(actionId); },
  async rejectAction(actionId:string,reason?:string){ return seniorSalesAgentService.rejectAction(actionId,reason); },
  async markActionSent(actionId:string,metadata?:any){ return seniorSalesAgentService.markActionSent(actionId,metadata); },
  async dueFollowUps(limit=50){
    const rows=await (prisma as any).$queryRawUnsafe('SELECT f.id,f.conversationId,f.scheduledAt,f.reason,f.draft,c.context,c.stage,c.temperature FROM "SalesFollowUp" f JOIN "SalesConversation" c ON c.id=f.conversationId WHERE f.status=\'PENDING\' AND datetime(f.scheduledAt)<=datetime(\'now\') AND c.status=\'OPEN\' ORDER BY f.scheduledAt ASC LIMIT ?',(Number.isFinite(limit)?Math.min(100,Math.max(1,limit)):50));
    return rows.map((row:any)=>{let ctx:any={};try{ctx=row.context?JSON.parse(row.context):{};}catch{} return {...row,context:undefined,companyName:ctx?.prospect?.companyName||null,prospectId:ctx?.prospect?.id||null,phone:ctx?.prospect?.phone||null};});
  },
  async sellerQueue(limit=50){
    const safeLimit=Number.isFinite(limit)?Math.min(100,Math.max(1,limit)):50;
    const rows=await (prisma as any).$queryRawUnsafe(`
      SELECT p.id,p.prospectId,p.stage,p.priority,p.nextAction,p.updatedAt,
             w.companyName,w.segment,w.city,w.phone,w.websiteOpportunityScore,
             c.id conversationId,c.status conversationStatus,c.temperature,c.intentScore
      FROM "RbFactorySalesPipeline" p
      JOIN "WebsiteProspect" w ON w.id=p.prospectId
      LEFT JOIN "SalesConversation" c ON c.id=(
        SELECT c2.id FROM "SalesConversation" c2
        WHERE c2.context LIKE '%' || p.prospectId || '%' ORDER BY c2.createdAt DESC LIMIT 1
      )
      WHERE p.status='OPEN' AND p.stage NOT IN ('WON','LOST')
      ORDER BY
        CASE WHEN p.nextAction='ASK_FOR_CLOSE' THEN 1
             WHEN p.nextAction='INVESTIGATE_OBJECTION' THEN 2
             WHEN p.nextAction='FOLLOW_UP' THEN 3
             WHEN p.stage='PROPOSAL_READY' THEN 4
             WHEN p.stage='DEMO_READY' THEN 5 ELSE 6 END,
        p.priority DESC,p.updatedAt DESC
      LIMIT ?`,safeLimit);
    return rows.map((row:any)=>({
      ...row,
      sellerState:row.stage==='DISCOVERED'||row.stage==='AUDITED'?'APPROACH_PENDING':
        row.stage==='CONTACTED'?'WAITING_REPLY':
        row.stage==='NEGOTIATION'?'NEGOTIATION':row.stage
    }));
  },
  async executeCommercialDecision(prospectId:string){
    const context=await this.context(prospectId);
    const pipeline=context.pipeline;
    if(!pipeline) return {executed:false,action:'WAIT',reason:'PIPELINE_NOT_FOUND'};
    if(['WON','LOST'].includes(String(pipeline.stage))) return {executed:false,action:'WAIT',reason:'TERMINAL_PIPELINE',stage:pipeline.stage};
    const conversation=await this.ensureConversation(prospectId,'WHATSAPP');
    const c=conversation.conversation;
    const nextAction=String(pipeline.nextAction||'');
    const { rbFactorySalesService }=await import('./rbFactorySalesService');

    if(nextAction==='PREPARE_DEMO' || nextAction==='SEND_DEMO' || String(pipeline.stage)==='AUDITED'){
      if(context.demo?.status==='READY' || context.demo?.status==='APPROVED'){
        const draft=await seniorSalesAgentService.prepareDemoApproach(c.id);
        return {executed:true,action:'SEND_DEMO',reason:'DEMO_ALREADY_READY',conversationId:c.id,draft};
      }
      const demo=await rbFactorySalesService.buildDemo(prospectId);
      if(demo?.qualityRecommendation==='approve' && Number(demo?.qualityScore||0)>=7.5){
        const draft=await seniorSalesAgentService.prepareDemoApproach(c.id);
        return {executed:true,action:'SEND_DEMO',reason:'DEMO_BUILT_AND_APPROVED',conversationId:c.id,demo,draft};
      }
      return {executed:true,action:'WAIT',reason:'DEMO_QUALITY_GATE_NOT_PASSED',demo};
    }

    if(nextAction==='PREPARE_PROPOSAL' || nextAction==='SEND_PROPOSAL' || String(pipeline.stage)==='PROPOSAL_READY'){
      if(context.proposal?.status==='READY' || context.proposal?.status==='SENT'){
        const draft=await seniorSalesAgentService.prepareProposalApproach(c.id);
        return {executed:true,action:'SEND_PROPOSAL',reason:'PROPOSAL_ALREADY_READY',conversationId:c.id,draft};
      }
      if(!context.demo || !['READY','APPROVED'].includes(String(context.demo.status))) return {executed:false,action:'WAIT',reason:'DEMO_REQUIRED_BEFORE_PROPOSAL'};
      const proposal=await rbFactorySalesService.buildProposal(prospectId);
      return {executed:true,action:'SEND_PROPOSAL',reason:'PROPOSAL_BUILT',conversationId:c.id,proposal};
    }

    if(nextAction==='ASK_FOR_CLOSE' || nextAction==='FOLLOW_UP' || nextAction==='INVESTIGATE_OBJECTION' || nextAction==='DISCOVER_NEED' || nextAction==='DISCOVER_DECISION_MAKER'){
      const reason=nextAction;
      const prepared=await seniorSalesAgentService.prepareFollowUp(c.id,reason);
      const followUp=await seniorSalesAgentService.scheduleFollowUp(c.id,{scheduledAt:new Date(),reason,draft:prepared.draft});
      return {executed:true,action:reason,reason:'SELLER_MESSAGE_PREPARED',conversationId:c.id,followUp,prepared};
    }
    return {executed:false,action:'WAIT',reason:'NO_EXECUTABLE_COMMERCIAL_ACTION',nextAction};
  },
  async prepareNextSellerAction(prospectId?:string){
    const queue=prospectId
      ? (await this.sellerQueue(50)).filter((candidate:any)=>String(candidate.prospectId)===String(prospectId)).slice(0,1)
      : await this.sellerQueue(1);
    const item=queue[0];
    if(!item) return {available:false,created:false,nextAction:null};
    const targetProspectId=String(item.prospectId);
    const stage=String(item.stage);
    const nextAction=String(item.nextAction||'');
    // Check existing work before executing a new commercial decision.
    // This prevents repeated autonomy cycles from creating duplicate actions
    // or follow-ups while an outbound step is already pending.
    const conversation=await this.ensureConversation(targetProspectId,'WHATSAPP');
    const conversationId=conversation.conversation.id;
    const pending=await (prisma as any).$queryRawUnsafe('SELECT * FROM "SalesAction" WHERE conversationId=? AND status IN ('PENDING_APPROVAL','APPROVED') ORDER BY createdAt DESC LIMIT 1',conversationId);
    if(pending[0]) return {available:true,created:false,item,conversationId,action:pending[0],reason:'EXISTING_ACTION'};
    const pendingFollow=await (prisma as any).$queryRawUnsafe('SELECT * FROM "SalesFollowUp" WHERE conversationId=? AND status='PENDING' ORDER BY scheduledAt ASC LIMIT 1',conversationId);
    if(pendingFollow[0]) return {available:true,created:false,item,conversationId,followUp:pendingFollow[0],reason:'EXISTING_FOLLOW_UP'};

    if(['PREPARE_DEMO','PREPARE_PROPOSAL','SEND_DEMO','SEND_PROPOSAL','ASK_FOR_CLOSE','INVESTIGATE_OBJECTION','DISCOVER_NEED','DISCOVER_DECISION_MAKER'].includes(nextAction)){
      return await this.executeCommercialDecision(targetProspectId);
    }
    let draft:any;
    if(stage==='DISCOVERED'||stage==='AUDITED') draft=await seniorSalesAgentService.prepareInitialApproach(conversationId);
    else if(stage==='DEMO_READY'||nextAction==='SEND_DEMO'||nextAction==='PREPARE_DEMO') draft=await seniorSalesAgentService.prepareDemoApproach(conversationId);
    else if(stage==='PROPOSAL_READY'||nextAction==='FOLLOW_UP_PROPOSAL'||nextAction==='SEND_PROPOSAL'||nextAction==='PREPARE_PROPOSAL') draft=await seniorSalesAgentService.prepareProposalApproach(conversationId);
    else if(nextAction==='FOLLOW_UP'||nextAction==='INVESTIGATE_OBJECTION'||nextAction==='ASK_FOR_CLOSE'||nextAction==='DISCOVER_NEED'||nextAction==='DISCOVER_DECISION_MAKER') {
      const reason=nextAction;
      const aiResult=await seniorSalesAgentService.prepareFollowUp(conversationId,reason);
      const follow=await seniorSalesAgentService.scheduleFollowUp(conversationId,{scheduledAt:new Date(),reason,draft:aiResult.draft});
      return {available:true,created:true,item,conversationId,followUp:follow,reason:'FOLLOW_UP_PREPARED'};
    }
    else return {available:true,created:false,item,conversationId,reason:'WAITING_FOR_CUSTOMER_OR_NEXT_EVENT'};
    return {available:true,created:true,item,conversationId,draft};
  },
  async nextSellerAction(){
    const queue=await this.sellerQueue(1);
    const item=queue[0];
    if(!item) return {available:false,nextAction:null};
    const conversationId=item.conversationId||null;
    let action:any=null;
    let followUp:any=null;
    if(conversationId){
      const actions=await (prisma as any).$queryRawUnsafe('SELECT * FROM "SalesAction" WHERE conversationId=? AND status IN (\'PENDING_APPROVAL\',\'APPROVED\') ORDER BY createdAt DESC LIMIT 1',conversationId);
      action=actions[0]||null;
      const follows=await (prisma as any).$queryRawUnsafe('SELECT * FROM "SalesFollowUp" WHERE conversationId=? AND status=\'PENDING\' ORDER BY scheduledAt ASC LIMIT 1',conversationId);
      followUp=follows[0]||null;
    }
    let channel:any=null;
    if(action) channel=await seniorSalesAgentService.prepareActionChannel(action.id);
    return {available:true,item,action,followUp,channel};
  },
  async dashboard(){
    const base=await seniorSalesAgentService.dashboard();
    const pipeline=await (prisma as any).$queryRawUnsafe('SELECT p.id,p.prospectId,p.stage,p.priority,p.nextAction,p.updatedAt,w.companyName,w.segment,w.city,w.phone,w.websiteOpportunityScore FROM "RbFactorySalesPipeline" p JOIN "WebsiteProspect" w ON w.id=p.prospectId WHERE p.status=\'OPEN\' ORDER BY p.priority DESC,p.updatedAt DESC LIMIT 100');
    const stageCounts=await (prisma as any).$queryRawUnsafe('SELECT stage, COUNT(*) count FROM "RbFactorySalesPipeline" GROUP BY stage ORDER BY stage');
    const pendingActionsRaw=await (prisma as any).$queryRawUnsafe('SELECT a.id,a.conversationId,a.type,a.title,a.payload,a.createdAt,c.context,c.stage,c.temperature FROM "SalesAction" a JOIN "SalesConversation" c ON c.id=a.conversationId WHERE a.status=\'PENDING_APPROVAL\' ORDER BY a.createdAt DESC LIMIT 100');
    const pendingActions=pendingActionsRaw.map((a:any)=>{let ctx:any={};try{ctx=a.context?JSON.parse(a.context):{};}catch{} return {...a,context:undefined,companyName:ctx?.prospect?.companyName||null,prospectId:ctx?.prospect?.id||null,phone:ctx?.prospect?.phone||null};});
    const pendingFollowUpsRaw=await (prisma as any).$queryRawUnsafe('SELECT f.id,f.conversationId,f.scheduledAt,f.reason,f.draft,c.context,c.stage,c.temperature FROM "SalesFollowUp" f JOIN "SalesConversation" c ON c.id=f.conversationId WHERE f.status=\'PENDING\' ORDER BY f.scheduledAt ASC LIMIT 100');
    const pendingFollowUps=pendingFollowUpsRaw.map((f:any)=>{let ctx:any={};try{ctx=f.context?JSON.parse(f.context):{};}catch{} return {...f,context:undefined,companyName:ctx?.prospect?.companyName||null,prospectId:ctx?.prospect?.id||null,phone:ctx?.prospect?.phone||null};});
    return {...base,rbFactoryPipeline:stageCounts,pipeline,pendingActions,pendingFollowUps};
  }
};
