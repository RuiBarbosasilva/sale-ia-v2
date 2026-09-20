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
  async createConversation(prospectId:string,channel='WHATSAPP'){
    const context=await this.context(prospectId);
    const c=await seniorSalesAgentService.createConversation({channel,leadId:context.lead?.id||null,context});
    return {conversation:c,commercialContext:context};
  },
  async respond(prospectId:string,conversationId:string,message:string){
    const context=await this.context(prospectId);
    const conversation=await seniorSalesAgentService.getConversation(conversationId);
    if(conversation.context && JSON.parse(conversation.context).prospect?.id!==prospectId) throw new Error('SALES_CONVERSATION_PROSPECT_MISMATCH');
    const result=await seniorSalesAgentService.respond(conversationId,{message});
    return {result,commercialContext:context};
  },
  async dashboard(){
    const base=await seniorSalesAgentService.dashboard();
    const rows=await (prisma as any).$queryRawUnsafe('SELECT stage, COUNT(*) count FROM "RbFactorySalesPipeline" GROUP BY stage ORDER BY stage');
    return {...base,rbFactoryPipeline:rows};
  }
};
