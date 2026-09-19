import { prisma } from '../modules/mercadoLivre/lib/prisma';

let initialized = false;

async function init() {
  if (initialized) return;
  await (prisma as any).$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "SalesOffer" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "name" TEXT NOT NULL,
      "channel" TEXT NOT NULL DEFAULT 'WEB',
      "productType" TEXT,
      "price" REAL,
      "monthlyPrice" REAL,
      "currency" TEXT NOT NULL DEFAULT 'BRL',
      "active" INTEGER NOT NULL DEFAULT 1,
      "metadata" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS "SalesExperiment" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "name" TEXT NOT NULL,
      "hypothesis" TEXT NOT NULL,
      "metric" TEXT NOT NULL,
      "variantA" TEXT,
      "variantB" TEXT,
      "status" TEXT NOT NULL DEFAULT 'PLANNED',
      "target" REAL,
      "result" REAL,
      "notes" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS "SalesMetric" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "metric" TEXT NOT NULL,
      "value" REAL NOT NULL DEFAULT 0,
      "source" TEXT,
      "referenceId" TEXT,
      "occurredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  initialized = true;
}

function id(){ return crypto.randomUUID(); }
function n(v:any){ const x=Number(v); return Number.isFinite(x)?x:0; }

export const salesOrchestrationService = {
  async offers(){
    await init();
    return (prisma as any).$queryRawUnsafe('SELECT * FROM "SalesOffer" WHERE active=1 ORDER BY updatedAt DESC');
  },
  async createOffer(input:any){
    await init();
    const v=[id(),String(input.name||'Oferta'),String(input.channel||'WEB'),input.productType||null,input.price==null?null:n(input.price),input.monthlyPrice==null?null:n(input.monthlyPrice),input.currency||'BRL',input.metadata?JSON.stringify(input.metadata):null];
    await (prisma as any).$executeRawUnsafe('INSERT INTO "SalesOffer" ("id","name","channel","productType","price","monthlyPrice","currency","metadata") VALUES (?,?,?,?,?,?,?,?)',...v);
    return (prisma as any).$queryRawUnsafe('SELECT * FROM "SalesOffer" WHERE id=?',v[0]);
  },
  async experiments(){
    await init();
    return (prisma as any).$queryRawUnsafe('SELECT * FROM "SalesExperiment" ORDER BY createdAt DESC LIMIT 200');
  },
  async createExperiment(input:any){
    await init();
    const v=[id(),String(input.name||'Experimento'),String(input.hypothesis||''),String(input.metric||'conversion_rate'),input.variantA||null,input.variantB||null,input.status||'PLANNED',input.target==null?null:n(input.target)];
    await (prisma as any).$executeRawUnsafe('INSERT INTO "SalesExperiment" ("id","name","hypothesis","metric","variantA","variantB","status","target") VALUES (?,?,?,?,?,?,?,?)',...v);
    return (prisma as any).$queryRawUnsafe('SELECT * FROM "SalesExperiment" WHERE id=?',v[0]);
  },
  async recordMetric(input:any){
    await init();
    const v=[id(),String(input.metric||'unknown'),n(input.value),input.source||null,input.referenceId||null,input.occurredAt||new Date().toISOString()];
    await (prisma as any).$executeRawUnsafe('INSERT INTO "SalesMetric" ("id","metric","value","source","referenceId","occurredAt") VALUES (?,?,?,?,?,?)',...v);
    return (prisma as any).$queryRawUnsafe('SELECT * FROM "SalesMetric" WHERE id=?',v[0]);
  },
  async analytics(){
    await init();
    const q=async(sql:string)=>Number((await (prisma as any).$queryRawUnsafe(sql))[0]?.count||0);
    const [conversations,hot,actions,followups,offers,experiments] = await Promise.all([
      q('SELECT COUNT(*) count FROM "SalesConversation" WHERE status=\'OPEN\''),
      q('SELECT COUNT(*) count FROM "SalesConversation" WHERE temperature IN (\'HOT\',\'VERY_HOT\')'),
      q('SELECT COUNT(*) count FROM "SalesAction" WHERE status=\'PENDING_APPROVAL\''),
      q('SELECT COUNT(*) count FROM "SalesFollowUp" WHERE status=\'PENDING\''),
      q('SELECT COUNT(*) count FROM "SalesOffer" WHERE active=1'),
      q('SELECT COUNT(*) count FROM "SalesExperiment" WHERE status IN (\'PLANNED\',\'RUNNING\')')
    ]);
    const metrics=await (prisma as any).$queryRawUnsafe('SELECT metric, SUM(value) as value, COUNT(*) as samples FROM "SalesMetric" GROUP BY metric ORDER BY metric');
    return { funnel:{openConversations:conversations,hotLeads:hot,pendingActions:actions,pendingFollowUps:followups}, offers, activeExperiments:experiments, metrics };
  },
  async dueFollowUps(){
    await init();
    const rows=await (prisma as any).$queryRawUnsafe('SELECT * FROM "SalesFollowUp" WHERE status=\'PENDING\' AND scheduledAt<=CURRENT_TIMESTAMP ORDER BY scheduledAt ASC');
    return rows;
  },
  async markFollowUp(idv:string,status:string){
    await init();
    const allowed=['PENDING','READY','DONE','CANCELLED'];
    if(!allowed.includes(status)) throw new Error('INVALID_FOLLOWUP_STATUS');
    await (prisma as any).$executeRawUnsafe('UPDATE "SalesFollowUp" SET status=? WHERE id=?',status,idv);
    return (prisma as any).$queryRawUnsafe('SELECT * FROM "SalesFollowUp" WHERE id=?',idv);
  }
};
