import { prisma } from '../modules/mercadoLivre/lib/prisma';
import { seniorSalesAgentService } from './seniorSalesAgentService';

export const rbFactorySalesAgentService = {
  async context(prospectId:string){
    const prospect=await prisma.websiteProspect.findUnique({where:{id:prospectId}});
    if(!prospect) throw new Error('WEBSITE_PROSPECT_NOT_FOUND');
    const demo=await prisma.websiteDemo.findFirst({where:{prospectId,status:{in:['READY','APPROVED']}},orderBy:{version:'desc'}});
    const proposal=await prisma.websiteProposal.findFirst({where:{prospectId},orderBy:{id:'desc'}});
    const lead=prospect.linkedLeadId ? await prisma.lead.findUnique({where:{id:prospect.linkedLeadId}}) : null;
    const pipelineRows=await (prisma as any).$queryRawUnsafe('SELECT * FROM "RbFactorySalesPipeline" WHERE prospectId=? LIMIT 1',prospectId);
    const pipeline=pipelineRows[0]||null;
    return {
      source:'RB_FACTORY_SITES', prospect:{id:prospect.id,companyName:prospect.companyName,segment:prospect.segment,city:prospect.city,state:prospect.state,phone:prospect.phone,email:prospect.email,currentWebsite:prospect.currentWebsite,websiteOpportunityStatus:prospect.websiteOpportunityStatus,websiteOpportunityScore:prospect.websiteOpportunityScore,priority:prospect.priority,status:prospect.status},
      demo:demo?{id:demo.id,version:demo.version,status:demo.status,qualityScore:demo.qualityScore}:null,
      proposal:proposal?{id:proposal.id,status:proposal.status,content:proposal.content}:null,
      lead:lead?{id:lead.id,name:lead.name,stage:lead.stage,status:lead.status,score:lead.score}:null,
      pipeline:pipeline?{id:pipeline.id,stage:pipeline.stage,nextAction:pipeline.nextAction,priority:pipeline.priority}:null,
      salesRules:{neverInventPriceOrDeadline:true,neverCreateProjectBeforeAcceptedProposal:true,externalActionsRequireApproval:true}
    };
  },
  async ensureConversation(prospectId:string,channel='WHATSAPP'){
    const context=await this.context(prospectId);
    const rows=await (prisma as any).$queryRawUnsafe('SELECT * FROM "SalesConversation" WHERE channel=? AND context LIKE ? ORDER BY createdAt DESC LIMIT 1',channel,`%\\"id\\":\\"${prospectId}\\"%`);
    if(rows[0]) return {conversation:await seniorSalesAgentService.getConversation(rows[0].id),commercialContext:context,reused:true};
    const c=await seniorSalesAgentService.createConversation({channel,leadId:context.lead?.id||null,context});
    return {conversation:c,commercialContext:context,reused:false};
  },
  async createConversation(prospectId:string,channel='WHATSAPP'){
    const context=await this.context(prospectId);
    const c=await seniorSalesAgentService.createConversation({channel,leadId:context.lead?.id||null,context});
    return {conversation:c,commercialContext:context};
  },
  async prepareInitialApproach(prospectId:string,channel='WHATSAPP'){
    const conversation=await this.ensureConversation(prospectId,channel);
    const draft=await seniorSalesAgentService.prepareInitialApproach(conversation.conversation.id);
    return {...conversation,draft};
  },
  async respond(prospectId:string,conversationId:string,message:string){
    const context=await this.context(prospectId);
    const conversation=await seniorSalesAgentService.getConversation(conversationId);
    if(conversation.context){
      try{if(JSON.parse(conversation.context).prospect?.id!==prospectId) throw new Error('SALES_CONVERSATION_PROSPECT_MISMATCH');}
      catch(e:any){if(e?.message==='SALES_CONVERSATION_PROSPECT_MISMATCH') throw e;}
    }
    const result=await seniorSalesAgentService.respond(conversationId,{message});
    await this.syncPipelineAfterResponse(prospectId,result);
    const followUp=await seniorSalesAgentService.scheduleRecommendedFollowUp(conversationId,result);
    return {result,followUp,commercialContext:context};
  },
  async syncPipelineAfterResponse(prospectId:string,result:any){
    const rows=await (prisma as any).$queryRawUnsafe('SELECT * FROM "RbFactorySalesPipeline" WHERE prospectId=? LIMIT 1',prospectId);
    const pipeline=rows[0];
    if(!pipeline) return null;
    const current=String(pipeline.stage);
    const nextAction=String(result?.nextBestAction||'FOLLOW_UP');
    const temperature=String(result?.temperature||'COLD');
    const intentScore=Number(result?.intentScore||0);
    let nextStage=current;
    if(['DISCOVERED','AUDITED','DEMO_READY','PROPOSAL_READY','CONTACTED'].includes(current) && (temperature==='HOT'||temperature==='VERY_HOT'||intentScore>=45)){
      nextStage='NEGOTIATION';
    }
    if(current==='CONTACTED' && nextAction==='ASK_FOR_CLOSE') nextStage='NEGOTIATION';
    if(current==='LOST' || current==='WON') nextStage=current;
    const safeActions=new Set(['ASK_FOR_CLOSE','INVESTIGATE_OBJECTION','DISCOVER_NEED','SEND_FIRST_APPROACH','REVIEW']);
    const normalizedAction=safeActions.has(nextAction)?nextAction:'FOLLOW_UP';
    await (prisma as any).$executeRawUnsafe(
      'UPDATE "RbFactorySalesPipeline" SET stage=?,nextAction=?,notes=?,updatedAt=CURRENT_TIMESTAMP WHERE prospectId=?',
      nextStage,normalizedAction,JSON.stringify({salesAgent:{temperature,intentScore,objection:result?.objection||null,confidence:Number(result?.confidence||0),updatedAt:new Date().toISOString()}}),prospectId
    );
    return {stage:nextStage,nextAction:normalizedAction};
  },
  },
  async dashboard(){
    const base=await seniorSalesAgentService.dashboard();
    const rows=await (prisma as any).$queryRawUnsafe('SELECT stage, COUNT(*) count FROM "RbFactorySalesPipeline" GROUP BY stage ORDER BY stage');
    return {...base,rbFactoryPipeline:rows};
  }
};
