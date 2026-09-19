import { prisma } from '../modules/mercadoLivre/lib/prisma';
import { siteAuditService } from './siteAuditService';
import { siteGeneratorService } from './siteGeneratorService';
import { proposalGeneratorService } from './proposalGeneratorService';

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
    const audit=prospect.currentWebsite ? await siteAuditService.auditWebsite(prospect.currentWebsite) : {score:0,status:'NO_WEBSITE',opportunity:'HIGH',priority:'HIGH',reachable:false};
    const priority=Math.round((prospect.currentWebsite ? (100-(audit.score||0)) : 100) + (prospect.phone ? 5 : 0));
    const existing=await (prisma as any).$queryRawUnsafe('SELECT * FROM "RbFactorySalesPipeline" WHERE prospectId=? LIMIT 1',prospectId);
    if(existing[0]) return existing[0];
    const v=[id(),prospectId,prospect.currentWebsite?'AUDITED':'DISCOVERED',audit.score||0,Math.min(100,priority),null,null,prospect.currentWebsite?'GENERATE_DEMO':'GENERATE_DEMO','OPEN',JSON.stringify({audit})];
    await (prisma as any).$executeRawUnsafe('INSERT INTO "RbFactorySalesPipeline" ("id","prospectId","stage","auditScore","priority","nextAction","status","notes") VALUES (?,?,?,?,?,?,?,?)',...v);
    return (await (prisma as any).$queryRawUnsafe('SELECT * FROM "RbFactorySalesPipeline" WHERE id=?',v[0]))[0];
  },
  async buildDemo(prospectId:string){
    await init();
    const result=await siteGeneratorService.generateDemo(prospectId);
    await (prisma as any).$executeRawUnsafe('UPDATE "RbFactorySalesPipeline" SET stage=\'DEMO_READY\',demoId=?,nextAction=\'SEND_DEMO\',updatedAt=CURRENT_TIMESTAMP WHERE prospectId=?',result.demo.id,prospectId);
    return result;
  },
  async buildProposal(prospectId:string){
    await init();
    const proposal=await proposalGeneratorService.generateProposal(prospectId);
    await (prisma as any).$executeRawUnsafe('UPDATE "RbFactorySalesPipeline" SET stage=\'PROPOSAL_READY\',proposalId=?,nextAction=\'CONTACT_PROSPECT\',updatedAt=CURRENT_TIMESTAMP WHERE prospectId=?',proposal.id,prospectId);
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
