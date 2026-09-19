import { prisma } from '../modules/mercadoLivre/lib/prisma';

let initialized = false;

async function init() {
  if (initialized) return;
  await (prisma as any).$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "OpportunitySalesPlan" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "sourceType" TEXT NOT NULL,
      "sourceId" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "recommendedAction" TEXT NOT NULL,
      "channel" TEXT,
      "priority" INTEGER NOT NULL DEFAULT 50,
      "reason" TEXT,
      "payload" TEXT,
      "status" TEXT NOT NULL DEFAULT 'PENDING_APPROVAL',
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  initialized = true;
}

function id(){ return crypto.randomUUID(); }
function n(v:any){ const x=Number(v); return Number.isFinite(x)?x:0; }

export const opportunitySalesBridgeService = {
  async plans(status?: string) {
    await init();
    if (status) return (prisma as any).$queryRawUnsafe('SELECT * FROM "OpportunitySalesPlan" WHERE status=? ORDER BY priority DESC, createdAt DESC', status);
    return (prisma as any).$queryRawUnsafe('SELECT * FROM "OpportunitySalesPlan" ORDER BY priority DESC, createdAt DESC LIMIT 500');
  },

  async buildForOpportunity(opportunityId:string) {
    await init();
    const rows=await (prisma as any).$queryRawUnsafe('SELECT * FROM "HunterOpportunity" WHERE id=?', opportunityId);
    const opportunity=rows[0];
    if(!opportunity) throw new Error('HUNTER_OPPORTUNITY_NOT_FOUND');

    const evidence=await (prisma as any).$queryRawUnsafe('SELECT * FROM "HunterEvidence" WHERE opportunityId=? ORDER BY strength DESC LIMIT 10', opportunityId);
    const score=n(opportunity.totalScore);
    const plans:any[]=[];

    const add=async(action:string,channel:string,priority:number,reason:string,payload:any)=>{
      const title=String(action).replace(/_/g,' ')+' — '+opportunity.title;
      const exists=await (prisma as any).$queryRawUnsafe(
        'SELECT * FROM "OpportunitySalesPlan" WHERE sourceType=? AND sourceId=? AND recommendedAction=? AND status IN (\'PENDING_APPROVAL\',\'APPROVED\') LIMIT 1',
        'HUNTER',opportunityId,action
      );
      if(exists[0]) return exists[0];
      const v=[id(),'HUNTER',opportunityId,title,action,channel,priority,reason,JSON.stringify(payload),'PENDING_APPROVAL'];
      await (prisma as any).$executeRawUnsafe(
        'INSERT INTO "OpportunitySalesPlan" ("id","sourceType","sourceId","title","recommendedAction","channel","priority","reason","payload","status") VALUES (?,?,?,?,?,?,?,?,?,?)',
        ...v
      );
      return (await (prisma as any).$queryRawUnsafe('SELECT * FROM "OpportunitySalesPlan" WHERE id=?',v[0]))[0];
    };

    if(score>=55) {
      plans.push(await add(
        'CREATE_AFFILIATE_TEST','AFFILIATE',Math.round(score),
        'A oportunidade atingiu o estágio mínimo para teste. Verificar afiliação e evidências antes de investir.',
        { opportunityId, evidenceCount:evidence.length, stage:opportunity.stage, test:opportunity.recommendedTest }
      ));
      plans.push(await add(
        'CREATE_EDITORIAL_PROJECT','EDITORIAL',Math.max(50,Math.round(score-5)),
        'Transformar a oportunidade em conteúdo editorial somente como teste de demanda, sem prometer resultado.',
        { opportunityId, title:opportunity.title, evidenceCount:evidence.length }
      ));
      plans.push(await add(
        'CREATE_SITE_OFFER','WEB_SITE',Math.max(45,Math.round(score-10)),
        'Avaliar se existe serviço/site/automação vendável para o mercado identificado.',
        { opportunityId, market:opportunity.market, category:opportunity.category }
      ));
    }

    if(score>=75) {
      plans.push(await add(
        'RUN_PAID_TEST','PAID_TEST',Math.round(score-2),
        'Score alto não autoriza gasto automático: requer aprovação humana e orçamento definido.',
        { opportunityId, budget:null, successMetric:'conversion_rate', stopRule:'definir antes do teste' }
      ));
    }

    return { opportunity, evidenceCount:evidence.length, plans };
  },

  async approve(planId:string) {
    await init();
    const rows=await (prisma as any).$queryRawUnsafe('SELECT * FROM "OpportunitySalesPlan" WHERE id=?',planId);
    if(!rows[0]) throw new Error('SALES_PLAN_NOT_FOUND');
    if(rows[0].status!=='PENDING_APPROVAL') throw new Error('SALES_PLAN_NOT_PENDING');
    await (prisma as any).$executeRawUnsafe('UPDATE "OpportunitySalesPlan" SET status=\'APPROVED\', updatedAt=CURRENT_TIMESTAMP WHERE id=?',planId);
    return (await (prisma as any).$queryRawUnsafe('SELECT * FROM "OpportunitySalesPlan" WHERE id=?',planId))[0];
  },

  async reject(planId:string) {
    await init();
    const rows=await (prisma as any).$queryRawUnsafe('SELECT * FROM "OpportunitySalesPlan" WHERE id=?',planId);
    if(!rows[0]) throw new Error('SALES_PLAN_NOT_FOUND');
    await (prisma as any).$executeRawUnsafe('UPDATE "OpportunitySalesPlan" SET status=\'REJECTED\', updatedAt=CURRENT_TIMESTAMP WHERE id=?',planId);
    return (await (prisma as any).$queryRawUnsafe('SELECT * FROM "OpportunitySalesPlan" WHERE id=?',planId))[0];
  }
};
