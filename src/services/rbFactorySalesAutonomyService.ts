import { randomUUID } from 'crypto';
import { prisma } from '../modules/mercadoLivre/lib/prisma';
import { rbFactorySalesAgentService } from './rbFactorySalesAgentService';
import { rbFactorySiteMaintenanceService } from './website/rbFactorySiteMaintenanceService';

type SellerStatus = 'RUNNING' | 'STOPPED';
type Run = { id: string; createdAt: string; status: string; message: string; result?: any };
type Alert = { id: string; createdAt: string; message: string; status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED' };

let status: SellerStatus = 'STOPPED';
const AUTOSTART = String(process.env.RB_FACTORY_AUTOSTART || '').toLowerCase() === 'true';
let timer: NodeJS.Timeout | null = null;
let initialized = false;

async function init(): Promise<void> {
  if (initialized) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "RbFactorySalesAutonomyRun" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "status" TEXT NOT NULL,
      "message" TEXT NOT NULL,
      "result" TEXT
    );
    CREATE TABLE IF NOT EXISTS "RbFactorySalesAutonomyAlert" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "message" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'OPEN'
    );
  `);
  initialized = true;
}

async function pushRun(run: Run): Promise<void> {
  await init();
  await prisma.$executeRawUnsafe(
    'INSERT INTO "RbFactorySalesAutonomyRun" ("id","createdAt","status","message","result") VALUES (?,?,?,?,?)',
    run.id, run.createdAt, run.status, run.message, run.result === undefined ? null : JSON.stringify(run.result)
  );
  await prisma.$executeRawUnsafe(
    'DELETE FROM "RbFactorySalesAutonomyRun" WHERE "id" NOT IN (SELECT "id" FROM "RbFactorySalesAutonomyRun" ORDER BY "createdAt" DESC LIMIT 50)'
  );
}

async function pushAlert(alert: Alert): Promise<void> {
  await init();
  await prisma.$executeRawUnsafe(
    'INSERT INTO "RbFactorySalesAutonomyAlert" ("id","createdAt","message","status") VALUES (?,?,?,?)',
    alert.id, alert.createdAt, alert.message, alert.status
  );
  await prisma.$executeRawUnsafe(
    'DELETE FROM "RbFactorySalesAutonomyAlert" WHERE "id" NOT IN (SELECT "id" FROM "RbFactorySalesAutonomyAlert" ORDER BY "createdAt" DESC LIMIT 20)'
  );
}

async function readRuns(limit: number): Promise<Run[]> {
  await init();
  const rows = await prisma.$queryRawUnsafe<any[]>(
    'SELECT "id","createdAt","status","message","result" FROM "RbFactorySalesAutonomyRun" ORDER BY "createdAt" DESC LIMIT ?',
    limit
  );
  return rows.map((row) => {
    let result: any = undefined;
    try { result = row.result ? JSON.parse(row.result) : undefined; } catch { result = undefined; }
    return { id: row.id, createdAt: row.createdAt, status: row.status, message: row.message, ...(result === undefined ? {} : { result }) };
  });
}

async function readAlerts(limit: number): Promise<Alert[]> {
  await init();
  return prisma.$queryRawUnsafe<Alert[]>(
    'SELECT "id","createdAt","message","status" FROM "RbFactorySalesAutonomyAlert" WHERE "status" != ? ORDER BY "createdAt" DESC LIMIT ?',
    'RESOLVED', limit
  );
}

async function cycle(): Promise<void> {
  if (status !== 'RUNNING') return;
  try {
    const [result, maintenance] = await Promise.all([
      rbFactorySalesAgentService.prepareNextSellerAction(),
      rbFactorySiteMaintenanceService.generateDueSuggestions(25),
    ]);
    await pushRun({
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      status: 'SUCCESS',
      message: result.hasAction ? 'Próxima ação comercial preparada.' : 'Fila comercial sem ação disponível.',
      result: { ...result, maintenanceSuggestions: maintenance.length },
    });
  } catch (error: any) {
    const message = String(error?.message || error || 'Erro no ciclo do vendedor');
    await pushRun({ id: randomUUID(), createdAt: new Date().toISOString(), status: 'ERROR', message });
    await pushAlert({ id: randomUUID(), createdAt: new Date().toISOString(), message, status: 'OPEN' });
  }
}

export const rbFactorySalesAutonomyService = {
  async status() {
    const runs = await readRuns(1);
    return { status, lastRun: runs[0] || null, intervalMs: 5 * 60 * 1000 };
  },

  async history(limit = 20) {
    return { runs: await readRuns(Math.min(50, Math.max(1, limit))) };
  },

  async alerts(limit = 10) {
    return { alerts: await readAlerts(Math.min(20, Math.max(1, limit))) };
  },

  async start() {
    if (status === 'RUNNING') return this.status();
    status = 'RUNNING';
    await cycle();
    timer = setInterval(() => { void cycle(); }, 5 * 60 * 1000);
    return this.status();
  },

  stop() {
    status = 'STOPPED';
    if (timer) { clearInterval(timer); timer = null; }
    return { status, lastRun: null, intervalMs: 5 * 60 * 1000 };
  },

  async acknowledge(id: string) {
    await init();
    const rows = await prisma.$queryRawUnsafe<Alert[]>(
      'SELECT "id","createdAt","message","status" FROM "RbFactorySalesAutonomyAlert" WHERE "id"=? LIMIT 1', id
    );
    if (!rows[0]) throw new Error('SELLER_ALERT_NOT_FOUND');
    await prisma.$executeRawUnsafe('UPDATE "RbFactorySalesAutonomyAlert" SET "status"=? WHERE "id"=?', 'ACKNOWLEDGED', id);
    return { ...rows[0], status: 'ACKNOWLEDGED' as const };
  },

  async resolve(id: string) {
    await init();
    const rows = await prisma.$queryRawUnsafe<Alert[]>(
      'SELECT "id","createdAt","message","status" FROM "RbFactorySalesAutonomyAlert" WHERE "id"=? LIMIT 1', id
    );
    if (!rows[0]) throw new Error('SELLER_ALERT_NOT_FOUND');
    await prisma.$executeRawUnsafe('UPDATE "RbFactorySalesAutonomyAlert" SET "status"=? WHERE "id"=?', 'RESOLVED', id);
    return { ...rows[0], status: 'RESOLVED' as const };
  },
};

if (AUTOSTART) {
  void rbFactorySalesAutonomyService.start().catch(async (error) => {
    await pushAlert({
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      message: String(error?.message || error),
      status: 'OPEN',
    });
  });
}
