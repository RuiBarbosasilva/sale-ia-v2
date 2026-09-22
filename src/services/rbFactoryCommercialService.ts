import { prisma } from '../modules/mercadoLivre/lib/prisma';

const STAGES = ['DISCOVERED','AUDITED','DEMO_READY','PROPOSAL_READY','CONTACTED','NEGOTIATION','WON','LOST'];

function stageLabel(stage:string){
  const map:any={DISCOVERED:'Descobertos',AUDITED:'Auditados',DEMO_READY:'Demo pronta',PROPOSAL_READY:'Proposta pronta',CONTACTED:'Contatados',NEGOTIATION:'Negociação',WON:'Vendidos',LOST:'Perdidos'};
  return map[stage]||stage;
}

export const rbFactoryCommercialService={
  async dashboard(city='Poços de Caldas',segment?:string){
    const where:any={city:{contains:city}};
    if(segment) where.segment={contains:segment};
    const prospects=await prisma.websiteProspect.findMany({where,orderBy:[{score:'desc'},{updatedAt:'desc'}],take:500});
    const prospectIds=prospects.map(p=>p.id);
    const pipelines=prospectIds.length ? await (prisma as any).$queryRawUnsafe(
      `SELECT p.*, w.companyName,w.segment,w.city,w.state,w.phone,w.email,w.currentWebsite,w.websiteStatus,w.score AS prospectScore
       FROM "RbFactorySalesPipeline" p JOIN "WebsiteProspect" w ON w.id=p.prospectId
       WHERE w.id IN (${prospectIds.map(()=>'?').join(',')})
       ORDER BY p.priority DESC,p.updatedAt DESC`,...prospectIds) : [];
    const counts:any={};
    for(const stage of STAGES) counts[stage]=pipelines.filter((p:any)=>p.stage===stage).length;
    const dueFollowUps=prospects.filter(p=>p.nextFollowUpAt && new Date(p.nextFollowUpAt).getTime()<=Date.now()).length;
    const withoutPipeline=prospects.filter(p=>!pipelines.some((x:any)=>x.prospectId===p.id)).length;
    const top=prospects.slice(0,30).map(p=>({id:p.id,companyName:p.companyName,segment:p.segment,city:p.city,phone:p.phone,email:p.email,currentWebsite:p.currentWebsite,websiteStatus:p.websiteStatus,websiteScore:p.websiteScore,score:p.score,scoreGrade:p.scoreGrade,status:p.status,nextFollowUpAt:p.nextFollowUpAt,priority:p.priority,estimatedValue:p.estimatedValue,contactedAt:p.contactedAt}));
    return {city,segment:segment||null,summary:{prospects:prospects.length,pipelines:pipelines.length,withoutPipeline,dueFollowUps,stages:Object.fromEntries(STAGES.map(s=>[stageLabel(s),counts[s]]))},top,pipelines};
  },

  async createPipelinesForQualified(city='Poços de Caldas',segment?:string,limit=50){
    const where:any={city:{contains:city},status:{notIn:['ARCHIVED','REJECTED']}};
    if(segment) where.segment={contains:segment};
    const prospects=await prisma.websiteProspect.findMany({where,orderBy:{score:'desc'},take:Math.min(200,Math.max(1,limit))});
    let created=0,updated=0;
    for(const p of prospects){
      const existing=await (prisma as any).$queryRawUnsafe('SELECT id FROM "RbFactorySalesPipeline" WHERE prospectId=? LIMIT 1',p.id);
      const priority=Math.min(100,Math.max(0,Number(p.score||0)+(p.phone?5:0)+(p.currentWebsite?0:5)));
      if(existing[0]){await (prisma as any).$executeRawUnsafe('UPDATE "RbFactorySalesPipeline" SET auditScore=?,priority=?,updatedAt=CURRENT_TIMESTAMP WHERE id=?',Number(p.websiteScore||0),priority,existing[0].id);updated++;continue;}
      await (prisma as any).$executeRawUnsafe('INSERT INTO "RbFactorySalesPipeline" ("id","prospectId","stage","auditScore","priority","nextAction","status","notes") VALUES (?,?,?,?,?,?,?,?)',crypto.randomUUID(),p.id,p.websiteStatus==='UNKNOWN'?'DISCOVERED':'AUDITED',Number(p.websiteScore||0),priority,p.currentWebsite?'AUDIT_SITE':'GENERATE_DEMO','OPEN',JSON.stringify({createdBy:'RB_FACTORY_COMMERCIAL_ENGINE'}));
      created++;
    }
    return {created,updated,total:prospects.length};
  },

  async prepareOutreachQueue(city='Poços de Caldas',segment?:string,limit=20){
    const data=await this.dashboard(city,segment);
    const candidates=data.top.filter((p:any)=>p.phone && !p.contactedAt && !['WON','LOST','ACCEPTED'].includes(p.status)).slice(0,limit);
    return candidates.map((p:any)=>({prospectId:p.id,companyName:p.companyName,channel:'WHATSAPP_OR_MANUAL',reason:p.websiteStatus==='NO_WEBSITE'?'Empresa sem site identificado':'Oportunidade de melhoria digital',suggestedMessage:`Olá, ${p.companyName}! Sou da RB Factory. Analisei rapidamente a presença digital da empresa e preparei uma ideia de como ela poderia ter um site mais profissional e voltado para gerar contatos. Posso te enviar a demonstração sem compromisso?`}));
  },

  async scheduleFollowUp(prospectId:string,days=3,note?:string){
    const when=new Date(Date.now()+Math.max(1,Math.min(90,days))*86400000);
    const p=await prisma.websiteProspect.update({where:{id:prospectId},data:{nextFollowUpAt:when,lastContactAt:new Date(),notes:note||undefined}});
    return p;
  }
};
