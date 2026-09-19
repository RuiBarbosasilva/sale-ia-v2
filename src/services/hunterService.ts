import { prisma } from '../modules/mercadoLivre/lib/prisma';
import { salesPlatformService } from './salesPlatformService';

let initialized = false;

async function init() {
  if (initialized) return;
  await (prisma as any).$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "HunterOpportunity" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "title" TEXT NOT NULL,
      "category" TEXT,
      "market" TEXT,
      "description" TEXT,
      "demandScore" REAL NOT NULL DEFAULT 0,
      "growthScore" REAL NOT NULL DEFAULT 0,
      "monetizationScore" REAL NOT NULL DEFAULT 0,
      "marginScore" REAL NOT NULL DEFAULT 0,
      "competitionScore" REAL NOT NULL DEFAULT 0,
      "acquisitionScore" REAL NOT NULL DEFAULT 0,
      "capitalScore" REAL NOT NULL DEFAULT 0,
      "speedScore" REAL NOT NULL DEFAULT 0,
      "evidenceScore" REAL NOT NULL DEFAULT 0,
      "totalScore" REAL NOT NULL DEFAULT 0,
      "stage" TEXT NOT NULL DEFAULT 'SIGNAL',
      "recommendedTest" TEXT,
      "status" TEXT NOT NULL DEFAULT 'ACTIVE',
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS "HunterEvidence" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "opportunityId" TEXT NOT NULL,
      "sourceUrl" TEXT,
      "sourceName" TEXT,
      "claim" TEXT NOT NULL,
      "evidenceType" TEXT,
      "strength" REAL NOT NULL DEFAULT 0,
      "capturedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS "DropshipSupplier" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "name" TEXT NOT NULL,
      "companyDocument" TEXT,
      "website" TEXT,
      "contactName" TEXT,
      "email" TEXT,
      "phone" TEXT,
      "city" TEXT,
      "state" TEXT,
      "acceptsDropshipping" INTEGER NOT NULL DEFAULT 0,
      "issuesInvoice" INTEGER NOT NULL DEFAULT 0,
      "neutralPackaging" INTEGER NOT NULL DEFAULT 0,
      "hasTracking" INTEGER NOT NULL DEFAULT 0,
      "returnPolicy" TEXT,
      "shippingSlaDays" INTEGER,
      "notes" TEXT,
      "status" TEXT NOT NULL DEFAULT 'DISCOVERED',
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS "DropshipProduct" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "supplierId" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "sku" TEXT,
      "sourceUrl" TEXT,
      "costPrice" REAL NOT NULL DEFAULT 0,
      "salePrice" REAL,
      "marketplaceFees" REAL NOT NULL DEFAULT 0,
      "shippingCost" REAL NOT NULL DEFAULT 0,
      "taxCost" REAL NOT NULL DEFAULT 0,
      "expectedMargin" REAL NOT NULL DEFAULT 0,
      "stock" INTEGER,
      "category" TEXT,
      "status" TEXT NOT NULL DEFAULT 'REVIEW',
      "notes" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  initialized = true;
}

function id(){ return cryptoRandom(); }
function cryptoRandom(){ return Math.random().toString(36).slice(2)+Date.now().toString(36); }
function n(v:any){ const x=Number(v); return Number.isFinite(x)?x:0; }
function clamp(x:number){ return Math.max(0,Math.min(100,x)); }

export const hunterService = {
  async dashboard() {
    await init();
    const [o,s,p] = await Promise.all([
      (prisma as any).$queryRawUnsafe('SELECT COUNT(*) as count FROM "HunterOpportunity"'),
      (prisma as any).$queryRawUnsafe('SELECT COUNT(*) as count FROM "DropshipSupplier"'),
      (prisma as any).$queryRawUnsafe('SELECT COUNT(*) as count FROM "DropshipProduct"')
    ]);
    return { opportunities:Number(o[0]?.count||0), suppliers:Number(s[0]?.count||0), products:Number(p[0]?.count||0), mode:'EVIDENCE_FIRST_SUPERVISED' };
  },
  async listOpportunities() {
    await init();
    return (prisma as any).$queryRawUnsafe('SELECT * FROM "HunterOpportunity" ORDER BY totalScore DESC, createdAt DESC LIMIT 200');
  },
  async createOpportunity(input:any) {
    await init();
    const scores=['demandScore','growthScore','monetizationScore','marginScore','competitionScore','acquisitionScore','capitalScore','speedScore','evidenceScore'].map(k=>clamp(n(input[k])));
    const total = Math.round((scores[0]*.14+scores[1]*.14+scores[2]*.14+scores[3]*.14+scores[4]*.10+scores[5]*.10+scores[6]*.08+scores[7]*.06+scores[8]*.10)*100)/100;
    const stage = total >= 75 ? 'VALIDATABLE' : total >= 55 ? 'OPPORTUNITY' : 'SIGNAL';
    const values=[id(),String(input.title||'Oportunidade sem título'),input.category||null,input.market||null,input.description||null,...scores,total,stage,input.recommendedTest||'Teste pequeno de aquisição e conversão',input.status||'ACTIVE'];
    await (prisma as any).$executeRawUnsafe(`INSERT INTO "HunterOpportunity" ("id","title","category","market","description","demandScore","growthScore","monetizationScore","marginScore","competitionScore","acquisitionScore","capitalScore","speedScore","evidenceScore","totalScore","stage","recommendedTest","status") VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,...values);
    return (prisma as any).$queryRawUnsafe('SELECT * FROM "HunterOpportunity" WHERE id=?',values[0]);
  },
  async addEvidence(opportunityId:string,input:any) {
    await init();
    const strength=clamp(n(input.strength||50));
    const ev=[id(),opportunityId,input.sourceUrl||null,input.sourceName||null,String(input.claim||''),input.evidenceType||'WEB',strength];
    await (prisma as any).$executeRawUnsafe(`INSERT INTO "HunterEvidence" ("id","opportunityId","sourceUrl","sourceName","claim","evidenceType","strength") VALUES (?,?,?,?,?,?,?)`,...ev);
    const rows=await (prisma as any).$queryRawUnsafe('SELECT AVG(strength) as avg FROM "HunterEvidence" WHERE opportunityId=?',opportunityId);
    await (prisma as any).$executeRawUnsafe('UPDATE "HunterOpportunity" SET evidenceScore=?, updatedAt=CURRENT_TIMESTAMP WHERE id=?',Number(rows[0]?.avg||0),opportunityId);
    return (prisma as any).$queryRawUnsafe('SELECT * FROM "HunterEvidence" WHERE id=?',ev[0]);
  },
  async suppliers() { await init(); return (prisma as any).$queryRawUnsafe('SELECT * FROM "DropshipSupplier" ORDER BY createdAt DESC LIMIT 500'); },
  async createSupplier(input:any) {
    await init();
    const v=[id(),String(input.name||'Fornecedor'),input.companyDocument||null,input.website||null,input.contactName||null,input.email||null,input.phone||null,input.city||null,input.state||null,input.acceptsDropshipping?1:0,input.issuesInvoice?1:0,input.neutralPackaging?1:0,input.hasTracking?1:0,input.returnPolicy||null,input.shippingSlaDays==null?null:n(input.shippingSlaDays),input.notes||null,input.status||'DISCOVERED'];
    await (prisma as any).$executeRawUnsafe(`INSERT INTO "DropshipSupplier" ("id","name","companyDocument","website","contactName","email","phone","city","state","acceptsDropshipping","issuesInvoice","neutralPackaging","hasTracking","returnPolicy","shippingSlaDays","notes","status") VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,...v);
    return (prisma as any).$queryRawUnsafe('SELECT * FROM "DropshipSupplier" WHERE id=?',v[0]);
  },
  async products() { await init(); return (prisma as any).$queryRawUnsafe('SELECT p.*, s.name supplierName FROM "DropshipProduct" p JOIN "DropshipSupplier" s ON s.id=p.supplierId ORDER BY p.expectedMargin DESC, p.createdAt DESC LIMIT 500'); },
  async createProduct(input:any) {
    await init();
    const cost=n(input.costPrice), sale=n(input.salePrice), fees=n(input.marketplaceFees), shipping=n(input.shippingCost), tax=n(input.taxCost);
    const margin=sale>0 ? ((sale-cost-fees-shipping-tax)/sale)*100 : 0;
    const v=[id(),String(input.supplierId||''),String(input.name||'Produto'),input.sku||null,input.sourceUrl||null,cost,sale||null,fees,shipping,tax,Math.round(margin*100)/100,input.stock==null?null:n(input.stock),input.category||null,margin>=20?'CANDIDATE':'REVIEW',input.notes||null];
    await (prisma as any).$executeRawUnsafe(`INSERT INTO "DropshipProduct" ("id","supplierId","name","sku","sourceUrl","costPrice","salePrice","marketplaceFees","shippingCost","taxCost","expectedMargin","stock","category","status","notes") VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,...v);
    return (prisma as any).$queryRawUnsafe('SELECT * FROM "DropshipProduct" WHERE id=?',v[0]);
  },
  async supplierChecklist(id:string) {
    await init();
    const rows=await (prisma as any).$queryRawUnsafe('SELECT * FROM "DropshipSupplier" WHERE id=?',id);
    if(!rows[0]) throw new Error('SUPPLIER_NOT_FOUND');
    const s=rows[0];
    const checks={acceptsDropshipping:Boolean(s.acceptsDropshipping),issuesInvoice:Boolean(s.issuesInvoice),neutralPackaging:Boolean(s.neutralPackaging),hasTracking:Boolean(s.hasTracking),returnPolicy:Boolean(s.returnPolicy),shippingSla:Boolean(s.shippingSlaDays)};
    const passed=Object.values(checks).filter(Boolean).length;
    return {supplier:s,checks,score:Math.round((passed/Object.keys(checks).length)*100),decision:passed>=5?'READY_FOR_HUMAN_PARTNERSHIP_REVIEW':'NEEDS_VERIFICATION'};
  },
  async platformBootstrap(){ return salesPlatformService.bootstrap(); }
};
