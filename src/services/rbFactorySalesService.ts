import { prisma } from '../modules/mercadoLivre/lib/prisma';
import { websiteDemoFactoryService } from './prospecting/websiteDemoFactoryService';
import { websiteService } from './website/websiteService';
import { proposalGeneratorService } from './proposalGeneratorService';
import { selectBenchmarkModel } from './rbFactoryTemplateEngine';
import { RB_BENCHMARK_CATALOG } from './rbFactoryBenchmarkCatalog';
import { rbFactorySalesAgentService } from './rbFactorySalesAgentService';
import { websiteCommercialService } from './websiteCommercialService';

let initialized=false;
async function init(){
  if(initialized) return;
  await (prisma as any).$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "RbFactorySalesPipeline" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "prospectId" TEXT NOT NULL,
      "stage" TEXT NOT NULL DEFAULT 'DISCOVERED',
      "auditScore" REAL NOT NULL DEFAULT 0,
      "priority" INTEGER NOT NULL DEFAULT 0,
      "demoId" TEXT,
      "proposalId" TEXT,
      "nextAction" TEXT,
      "status" TEXT NOT NULL DEFAULT 'OPEN',
      "notes" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  initialized=true;
}
function id(){return crypto.randomUUID();}
const pipelineLocks = new Map<string, Promise<void>>();

async function ensurePipelineUnlocked(prospectId:string){
  await init();
  const prospect=await prisma.websiteProspect.findUnique({where:{id:prospectId}});
  if(!prospect) throw new Error('WEBSITE_PROSPECT_NOT_FOUND');
  const auditScore=prospect.websiteScore ?? 0;
  const priority=Math.min(100, Math.round((prospect.score ?? prospect.websiteScore ?? 0) + (prospect.phone ? 5 : 0)));
  const audit={score:auditScore,status:prospect.websiteStatus || (prospect.currentWebsite ? 'UNKNOWN' : 'NO_WEBSITE'),priority:prospect.priority};
  const existing=await (prisma as any).$queryRawUnsafe('SELECT * FROM "RbFactorySalesPipeline" WHERE prospectId=? LIMIT 1',prospectId);
  if(existing[0]) {
    await (prisma as any).$executeRawUnsafe('UPDATE "RbFactorySalesPipeline" SET auditScore=?,priority=?,updatedAt=CURRENT_TIMESTAMP WHERE id=?',auditScore,priority,existing[0].id);
    return (await (prisma as any).$queryRawUnsafe('SELECT * FROM "RbFactorySalesPipeline" WHERE id=?',existing[0].id))[0];
  }
  const values=[id(),prospectId,prospect.currentWebsite?'AUDITED':'DISCOVERED',auditScore,priority,null,null,'GENERATE_DEMO','OPEN',JSON.stringify({audit,source:'official_prospecting_pipeline'})];
  await (prisma as any).$executeRawUnsafe('INSERT INTO "RbFactorySalesPipeline" ("id","prospectId","stage","auditScore","priority","nextAction","status","notes") VALUES (?,?,?,?,?,?,?,?)',...values);
  return (await (prisma as any).$queryRawUnsafe('SELECT * FROM "RbFactorySalesPipeline" WHERE id=?',values[0]))[0];
}

async function withPipelineLock<T>(prospectId:string, work:()=>Promise<T>):Promise<T>{
  const previous=pipelineLocks.get(prospectId)||Promise.resolve();
  let release!:()=>void;
  const current=new Promise<void>(resolve=>{release=resolve;});
  pipelineLocks.set(prospectId,current);
  await previous;
  try{return await work();}finally{release();if(pipelineLocks.get(prospectId)===current)pipelineLocks.delete(prospectId);}
}

export const rbFactorySalesService={
  async list(){
    await init();
    return (prisma as any).$queryRawUnsafe('SELECT p.*, w.companyName,w.segment,w.city,w.state,w.currentWebsite,w.phone FROM "RbFactorySalesPipeline" p JOIN "WebsiteProspect" w ON w.id=p.prospectId ORDER BY p.priority DESC,p.updatedAt DESC LIMIT 500');
  },

  async createFromProspect(prospectId:string){
    return withPipelineLock(prospectId,()=>ensurePipelineUnlocked(prospectId));
  },

  async models(prospectId:string){
    await init();
    const prospect=await prisma.websiteProspect.findUnique({where:{id:prospectId},select:{segment:true}});
    if(!prospect) throw new Error('WEBSITE_PROSPECT_NOT_FOUND');
    const segment=prospect.segment||'negocio';
    const preferredNiche=selectBenchmarkModel(segment).niche;
    return RB_BENCHMARK_CATALOG.map(niche=>({
      niche:niche.slug,name:niche.name,description:niche.description,preferred:niche.slug===preferredNiche,
      models:Array.from({length:10},(_,index)=>{const selection=selectBenchmarkModel(segment,niche.slug,index+1);return {index:index+1,variant:selection.variant,reference:selection.reference,reason:selection.reason};})
    }));
  },

  async buildDemo(prospectId:string,options?:{niche?:string;modelIndex?:number}){
    return withPipelineLock(prospectId, async()=>{
    await ensurePipelineUnlocked(prospectId);
    await init();
    const result=await websiteDemoFactoryService.generateDemoForProspect(prospectId,{useAI:true});
    const model=options?.modelIndex ? {index:options.modelIndex,niche:options.niche||null} : null;
    const pipeline=await (prisma as any).$queryRawUnsafe('SELECT notes FROM "RbFactorySalesPipeline" WHERE prospectId=? LIMIT 1',prospectId);
    let notes:any={}; try{notes=pipeline[0]?.notes?JSON.parse(pipeline[0].notes):{};}catch{notes={};}
    notes.demoModel=model;
    const demoStage = result.qualityRecommendation === 'approve' && Number(result.qualityScore || 0) >= 7.5 ? 'DEMO_READY' : 'AUDITED';
    const nextAction = demoStage === 'DEMO_READY' ? 'SEND_DEMO' : 'IMPROVE_DEMO';
    await (prisma as any).$executeRawUnsafe(`UPDATE "RbFactorySalesPipeline" SET stage=?,demoId=?,nextAction=?,notes=?,updatedAt=CURRENT_TIMESTAMP WHERE prospectId=?`,demoStage,result.demoId,nextAction,JSON.stringify(notes),prospectId);
    return result;
    });
  },

  async buildProposal(prospectId:string,planCode?:string,planId?:string){
    return withPipelineLock(prospectId, async()=>{
    await ensurePipelineUnlocked(prospectId);
    await init();
    const pipelineRows=await (prisma as any).$queryRawUnsafe('SELECT * FROM "RbFactorySalesPipeline" WHERE prospectId=? LIMIT 1',prospectId);
    const pipeline=pipelineRows[0];
    if (!['DEMO_READY', 'PROPOSAL_READY', 'CONTACTED', 'NEGOTIATION'].includes(pipeline.stage)) throw new Error('DEMO_NOT_READY_FOR_PROPOSAL');
    if (!pipeline.demoId) throw new Error('DEMO_NOT_READY_FOR_PROPOSAL');
    const selectedDemo = await prisma.websiteDemo.findUnique({where:{id:pipeline.demoId},select:{id:true,prospectId:true,version:true,status:true}});
    if (!selectedDemo || selectedDemo.prospectId !== prospectId || !['READY','APPROVED'].includes(selectedDemo.status)) throw new Error('DEMO_NOT_READY_FOR_PROPOSAL');
    const proposal=await proposalGeneratorService.generateProposal(prospectId,{planCode,planId,demoId:selectedDemo.id,demoVersion:selectedDemo.version});
    await (prisma as any).$executeRawUnsafe(`UPDATE "RbFactorySalesPipeline" SET stage='PROPOSAL_READY',proposalId=?,nextAction='CONTACT_PROSPECT',updatedAt=CURRENT_TIMESTAMP WHERE prospectId=?`,proposal.id,prospectId);
    const salesAgent=await rbFactorySalesAgentService.prepareProposalApproach(prospectId,'WHATSAPP');
    return {...proposal,salesAgent};
    });
  },

  async sendProposal(prospectId:string){
    return withPipelineLock(prospectId, async()=>{
    await init();
    const pipelineRows=await (prisma as any).$queryRawUnsafe('SELECT * FROM "RbFactorySalesPipeline" WHERE prospectId=? LIMIT 1',prospectId);
    const pipeline=pipelineRows[0];
    if (!pipeline) throw new Error('RB_FACTORY_PIPELINE_NOT_FOUND');
    if (!['PROPOSAL_READY','CONTACTED','NEGOTIATION'].includes(pipeline.stage)) throw new Error('PROPOSAL_NOT_READY_FOR_SENDING');
    const proposal = pipeline.proposalId
      ? await prisma.websiteProposal.findUnique({where:{id:pipeline.proposalId}})
      : null;
    if(!proposal) throw new Error('WEBSITE_PROPOSAL_NOT_FOUND');
    if(proposal.prospectId !== prospectId) throw new Error('INVALID_COMMERCIAL_STATE');
    if(!['READY','SENT'].includes(proposal.status)) throw new Error('WEBSITE_PROPOSAL_NOT_READY');
    const updated=await prisma.websiteProposal.update({where:{id:proposal.id},data:{status:'SENT',sentAt:proposal.sentAt||new Date()}});
    await prisma.websiteProspect.update({where:{id:prospectId},data:{status:'PROPOSAL_SENT',lastContactAt:new Date()}});
    await (prisma as any).$executeRawUnsafe(`UPDATE "RbFactorySalesPipeline" SET stage='CONTACTED',nextAction='FOLLOW_UP_PROPOSAL',proposalId=?,updatedAt=CURRENT_TIMESTAMP WHERE prospectId=?`,updated.id,prospectId);
    const salesAgent=await rbFactorySalesAgentService.ensureConversation(prospectId,'WHATSAPP');
    const followUp=await rbFactorySalesAgentService.prepareProposalApproach(prospectId,'WHATSAPP');
    return {...updated,salesAgent:{conversationId:salesAgent.conversation.id,reused:salesAgent.reused,proposalApproach:followUp.draft}};
    });
  },

  async convertToLead(prospectId:string){
    return withPipelineLock(prospectId, async()=>{
    await init();
    const prospect=await prisma.websiteProspect.findUnique({where:{id:prospectId}});
    if(!prospect) throw new Error('WEBSITE_PROSPECT_NOT_FOUND');
    if(prospect.linkedLeadId){const existing=await prisma.lead.findUnique({where:{id:prospect.linkedLeadId}});if(existing) return existing;}
    const phone=prospect.phone?.trim()||null;
    const email=prospect.email?.trim().toLowerCase()||null;
    const conditions:any[]=[]; if(phone) conditions.push({phone}); if(email) conditions.push({email});
    let lead=conditions.length ? await prisma.lead.findFirst({where:{OR:conditions}}) : null;
    if(!lead){
      try{lead=await prisma.lead.create({data:{name:prospect.contactPerson||prospect.companyName,phone,email,status:'NEW_LEAD',stage:'NEGOTIATION',score:prospect.score||prospect.websiteScore||0}});}
      catch(error:any){
        if(error?.code!=='P2002') throw error;
        const conflictConditions:any[]=[]; if(phone) conflictConditions.push({phone}); if(email) conflictConditions.push({email});
        lead=conflictConditions.length ? await prisma.lead.findFirst({where:{OR:conflictConditions}}) : null;
        if(!lead) throw error;
      }
    }
    if(lead) lead=await prisma.lead.update({where:{id:lead.id},data:{name:lead.name||prospect.contactPerson||prospect.companyName,stage:'NEGOTIATION',score:Math.max(lead.score||0,prospect.score||prospect.websiteScore||0)}});
    await prisma.websiteProspect.update({where:{id:prospectId},data:{linkedLeadId:lead.id,status:'NEGOTIATION'}});
    await (prisma as any).$executeRawUnsafe(`UPDATE "RbFactorySalesPipeline" SET stage='NEGOTIATION',nextAction='CLOSE_SALE',updatedAt=CURRENT_TIMESTAMP WHERE prospectId=?`,prospectId);
    return lead;
    });
  },

  async acceptProposal(prospectId:string,domainName?:string){
    return withPipelineLock(prospectId, async()=>{
    await init();
    const pipelineRows=await (prisma as any).$queryRawUnsafe('SELECT * FROM "RbFactorySalesPipeline" WHERE prospectId=? LIMIT 1',prospectId);
    const pipeline=pipelineRows[0];
    if(!pipeline) throw new Error('RB_FACTORY_PIPELINE_NOT_FOUND');
    if(!['PROPOSAL_READY','CONTACTED','NEGOTIATION','WON'].includes(pipeline.stage)) throw new Error('INVALID_COMMERCIAL_STATE');
    const proposal = pipeline.proposalId
      ? await prisma.websiteProposal.findUnique({where:{id:pipeline.proposalId}})
      : null;
    if(!proposal) throw new Error('WEBSITE_PROPOSAL_NOT_FOUND');
    if(proposal.prospectId !== prospectId) throw new Error('INVALID_COMMERCIAL_STATE');
    if(!['SENT','ACCEPTED'].includes(proposal.status)) throw new Error('WEBSITE_PROPOSAL_NOT_ACCEPTABLE');
    const result=await websiteCommercialService.acceptProposal(proposal.id,domainName);
    await (prisma as any).$executeRawUnsafe(`UPDATE "RbFactorySalesPipeline" SET stage='WON',nextAction='PREPARE_PROJECT',proposalId=?,updatedAt=CURRENT_TIMESTAMP WHERE prospectId=?`,proposal.id,prospectId);
    await rbFactorySalesAgentService.closeSellerForProspect(prospectId,'WON');
    return result;
    });
  },

  async updateStage(idv:string,stage:string,nextAction?:string,notes?:string){
    const rows=await (prisma as any).$queryRawUnsafe('SELECT "prospectId" FROM "RbFactorySalesPipeline" WHERE id=? LIMIT 1',idv);
    const pipeline=rows[0];
    if(!pipeline) throw new Error('RB_FACTORY_PIPELINE_NOT_FOUND');
    return withPipelineLock(pipeline.prospectId, async()=>{
      await init();
      const allowed=['DISCOVERED','AUDITED','DEMO_READY','PROPOSAL_READY','CONTACTED','NEGOTIATION','WON','LOST'];
      if(!allowed.includes(stage)) throw new Error('INVALID_PIPELINE_STAGE');
      const currentRows=await (prisma as any).$queryRawUnsafe('SELECT * FROM "RbFactorySalesPipeline" WHERE id=? LIMIT 1',idv);
      const current=currentRows[0];
      if(!current) throw new Error('RB_FACTORY_PIPELINE_NOT_FOUND');
      const transitions:any={
        DISCOVERED:['DISCOVERED','AUDITED','DEMO_READY','LOST'],AUDITED:['AUDITED','DEMO_READY','LOST'],
        DEMO_READY:['DEMO_READY','PROPOSAL_READY','LOST'],PROPOSAL_READY:['PROPOSAL_READY','CONTACTED','NEGOTIATION','LOST'],
        CONTACTED:['CONTACTED','NEGOTIATION','WON','LOST'],NEGOTIATION:['NEGOTIATION','WON','LOST'],WON:['WON'],LOST:['LOST']
      };
      if(stage!==current.stage && !transitions[current.stage]?.includes(stage)) throw new Error('INVALID_PIPELINE_TRANSITION');
      if(stage==='DEMO_READY'){
        if(!current.demoId) throw new Error('DEMO_NOT_READY_FOR_PIPELINE');
        const demo=await prisma.websiteDemo.findUnique({where:{id:current.demoId}});
        if(!demo || demo.prospectId!==current.prospectId || !['READY','APPROVED'].includes(demo.status)) throw new Error('DEMO_NOT_READY_FOR_PIPELINE');
      }
      const proposal=stage!=='DEMO_READY' && stage!=='DISCOVERED' && stage!=='AUDITED' && stage!=='LOST'
        ? (current.proposalId
          ? await prisma.websiteProposal.findUnique({where:{id:current.proposalId}})
          : null)
        : null;
      if(stage==='PROPOSAL_READY'){
        if(!proposal || !['READY','SENT'].includes(proposal.status)) throw new Error('WEBSITE_PROPOSAL_NOT_READY');
        if(!current.demoId || current.proposalId!==proposal.id) throw new Error('WEBSITE_PROPOSAL_NOT_READY');
      }
      if(stage==='CONTACTED'){
        if(!proposal || proposal.status!=='SENT') throw new Error('PROPOSAL_NOT_READY_FOR_SENDING');
        if(!current.proposalId || current.proposalId!==proposal.id) throw new Error('PROPOSAL_NOT_READY_FOR_SENDING');
      }
      if(stage==='NEGOTIATION'){
        if(!proposal || proposal.status!=='SENT') throw new Error('PROPOSAL_NOT_READY_FOR_SENDING');
        if(!current.proposalId || current.proposalId!==proposal.id) throw new Error('PROPOSAL_NOT_READY_FOR_SENDING');
      }
      if(stage==='WON'){
        if(!proposal || proposal.status!=='ACCEPTED') throw new Error('PROPOSAL_NOT_ACCEPTED');
        if(!current.proposalId || current.proposalId!==proposal.id) throw new Error('PROPOSAL_NOT_ACCEPTED');
        const project=await prisma.websiteProject.findFirst({where:{prospectId:current.prospectId}});
        const prospect=await prisma.websiteProspect.findUnique({where:{id:current.prospectId},select:{status:true}});
        if(!project || prospect?.status!=='WON') throw new Error('WEBSITE_PROJECT_NOT_READY');
      }
      if(stage==='LOST'){
        const prospect=await prisma.websiteProspect.findUnique({where:{id:current.prospectId},select:{status:true}});
        if(prospect?.status==='WON') throw new Error('INVALID_COMMERCIAL_STATE');
      }
      await (prisma as any).$executeRawUnsafe('UPDATE "RbFactorySalesPipeline" SET stage=?,nextAction=COALESCE(?,nextAction),notes=COALESCE(?,notes),updatedAt=CURRENT_TIMESTAMP WHERE id=?',stage,nextAction||null,notes||null,idv);
      return (await (prisma as any).$queryRawUnsafe('SELECT * FROM "RbFactorySalesPipeline" WHERE id=?',idv))[0];
    });
  }
};
