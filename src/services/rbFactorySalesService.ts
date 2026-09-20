import { prisma } from '../modules/mercadoLivre/lib/prisma';
import { websiteDemoFactoryService } from './prospecting/websiteDemoFactoryService';
import { proposalGeneratorService } from './proposalGeneratorService';
import { selectBenchmarkModel } from './rbFactoryTemplateEngine';
import { RB_BENCHMARK_CATALOG } from './rbFactoryBenchmarkCatalog';

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

export const rbFactorySalesService={
  async list(){
    await init();
    return (prisma as any).$queryRawUnsafe('SELECT p.*, w.companyName,w.segment,w.city,w.state,w.currentWebsite,w.phone FROM "RbFactorySalesPipeline" p JOIN "WebsiteProspect" w ON w.id=p.prospectId ORDER BY p.priority DESC,p.updatedAt DESC LIMIT 500');
  },

  async createFromProspect(prospectId:string){
    await init();
    const prospect=await prisma.websiteProspect.findUnique({where:{id:prospectId}});
    if(!prospect) throw new Error('WEBSITE_PROSPECT_NOT_FOUND');
    const auditScore=prospect.websiteHealthScore ?? 0;
    const priority=Math.min(100, Math.round((prospect.websiteOpportunityScore ?? 0) + (prospect.phone ? 5 : 0)));
    const audit={score:auditScore,status:prospect.websiteOpportunityStatus || (prospect.currentWebsite ? 'UNKNOWN' : 'NO_WEBSITE'),priority:prospect.priority};
    const existing=await (prisma as any).$queryRawUnsafe('SELECT * FROM "RbFactorySalesPipeline" WHERE prospectId=? LIMIT 1',prospectId);
    if(existing[0]) return existing[0];
    const v=[id(),prospectId,prospect.currentWebsite?'AUDITED':'DISCOVERED',auditScore,priority,null,null,'GENERATE_DEMO','OPEN',JSON.stringify({audit,source:'official_prospecting_pipeline'})];
    await (prisma as any).$executeRawUnsafe('INSERT INTO "RbFactorySalesPipeline" ("id","prospectId","stage","auditScore","priority","nextAction","status","notes") VALUES (?,?,?,?,?,?,?,?)',...v);
    return (await (prisma as any).$queryRawUnsafe('SELECT * FROM "RbFactorySalesPipeline" WHERE id=?',v[0]))[0];
  },

  async models(prospectId:string){
    await init();
    const prospect=await prisma.websiteProspect.findUnique({where:{id:prospectId},select:{segment:true}});
    if(!prospect) throw new Error('WEBSITE_PROSPECT_NOT_FOUND');
    const segment=prospect.segment||'negocio';
    const preferredNiche=selectBenchmarkModel(segment).niche;
    return RB_BENCHMARK_CATALOG.map(niche=>({
      niche:niche.slug,
      name:niche.name,
      description:niche.description,
      preferred:niche.slug===preferredNiche,
      models:Array.from({length:10},(_,index)=>{
        const selection=selectBenchmarkModel(segment,niche.slug,index+1);
        return {index:index+1,variant:selection.variant,reference:selection.reference,reason:selection.reason};
      })
    }));
  },

  async buildDemo(prospectId:string,options?:{niche?:string;modelIndex?:number}){
    await init();
    const result=await websiteDemoFactoryService.generateDemoForProspect(prospectId,{useAI:true});
    const model=options?.modelIndex ? {index:options.modelIndex,niche:options.niche||null} : null;
    const pipeline=await (prisma as any).$queryRawUnsafe('SELECT notes FROM "RbFactorySalesPipeline" WHERE prospectId=? LIMIT 1',prospectId);
    let notes:any={};
    try{notes=pipeline[0]?.notes?JSON.parse(pipeline[0].notes):{};}catch{notes={};}
    notes.demoModel=model;
    await (prisma as any).$executeRawUnsafe(`UPDATE "RbFactorySalesPipeline" SET stage='DEMO_READY',demoId=?,nextAction='SEND_DEMO',notes=?,updatedAt=CURRENT_TIMESTAMP WHERE prospectId=?`,result.demoId,JSON.stringify(notes),prospectId);
    return result;
  },

  async buildProposal(prospectId:string){
    await init();
    const proposal=await proposalGeneratorService.generateProposal(prospectId);
    await (prisma as any).$executeRawUnsafe(`UPDATE "RbFactorySalesPipeline" SET stage='PROPOSAL_READY',proposalId=?,nextAction='CONTACT_PROSPECT',updatedAt=CURRENT_TIMESTAMP WHERE prospectId=?`,proposal.id,prospectId);
    return proposal;
  },

  async updateStage(idv:string,stage:string,nextAction?:string,notes?:string){
    await init();
    const allowed=['DISCOVERED','AUDITED','DEMO_READY','PROPOSAL_READY','CONTACTED','NEGOTIATION','WON','LOST'];
    if(!allowed.includes(stage)) throw new Error('INVALID_PIPELINE_STAGE');
    await (prisma as any).$executeRawUnsafe('UPDATE "RbFactorySalesPipeline" SET stage=?,nextAction=COALESCE(?,nextAction),notes=COALESCE(?,notes),updatedAt=CURRENT_TIMESTAMP WHERE id=?',stage,nextAction||null,notes||null,idv);
    return (await (prisma as any).$queryRawUnsafe('SELECT * FROM "RbFactorySalesPipeline" WHERE id=?',idv))[0];
  }
};
