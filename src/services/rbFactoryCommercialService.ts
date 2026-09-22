import { randomUUID } from 'crypto';
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

  async today(city='Poços de Caldas',segment?:string){
    const data=await this.dashboard(city,segment);
    const now=Date.now();
    const rows=(data.pipelines||[]).map((p:any)=>{
      const due=p.nextFollowUpAt && new Date(p.nextFollowUpAt).getTime()<=now;
      const stale=p.updatedAt && (now-new Date(p.updatedAt).getTime())>=7*86400000;
      const contacted=Boolean(p.contactedAt);
      const stage=String(p.stage||'');
      const status=String(p.status||'');
      let bucket:string|null=null;
      if(due) bucket='FOLLOW_UP_DUE';
      else if(stage==='WON' || stage==='ACCEPTED' || status==='WON') bucket='WON_READY';
      else if(stage==='NEGOTIATION' && stale) bucket='NEGOTIATION_STALLED';
      else if(stage==='PROPOSAL_READY' || stage==='PROPOSAL_SENT' || status==='PROPOSAL_SENT') bucket='PROPOSAL_WAITING';
      else if(stage==='DEMO_READY') bucket='DEMO_TO_SEND';
      else if(stage==='AUDITED' || p.nextAction==='GENERATE_DEMO') bucket='DEMO_TO_GENERATE';
      else if(!contacted && ['DISCOVERED','AUDITED'].includes(stage)) bucket='NEW_CONTACT';
      return bucket ? {...p,bucket,actionLabel:({
        FOLLOW_UP_DUE:'Fazer follow-up',
        WON_READY:'Preparar projeto',
        NEGOTIATION_STALLED:'Retomar negociação',
        PROPOSAL_WAITING:'Ver proposta',
        DEMO_TO_SEND:'Enviar demo',
        DEMO_TO_GENERATE:'Gerar demo',
        NEW_CONTACT:'Primeiro contato'
      } as any)[bucket]} : null;
    }).filter(Boolean);
    const order=['FOLLOW_UP_DUE','DEMO_TO_GENERATE','DEMO_TO_SEND','NEW_CONTACT','PROPOSAL_WAITING','NEGOTIATION_STALLED','WON_READY'];
    const buckets:any={};
    for(const key of order) buckets[key]=rows.filter((r:any)=>r.bucket===key).slice(0,25);
    return {
      city,segment:segment||null,
      summary:Object.fromEntries(order.map(k=>[k,buckets[k].length])),
      buckets
    };
  },

  async scheduleFollowUp(prospectId:string,days=3,note?:string){
    const when=new Date(Date.now()+Math.max(1,Math.min(90,days))*86400000);
    const p=await prisma.websiteProspect.update({where:{id:prospectId},data:{nextFollowUpAt:when,lastContactAt:new Date(),notes:note||undefined}});
    return p;
  }
};
