import { prisma } from '../modules/mercadoLivre/lib/prisma';

export async function recordAudit(action: string, details?: string, metadata?: unknown) {
  try {
    const model: any = (prisma as any).systemAuditLog;
    if (model?.create) {
      return await model.create({ data: { action, details: details || null, metadata: metadata ? JSON.stringify(metadata) : null } });
    }
  } catch {}
  return { action, details: details || null, metadata: metadata || null, recordedAt: new Date().toISOString() };
}

export async function health() {
  try { await prisma.$queryRaw`SELECT 1`; return { ok: true }; }
  catch (error: any) { return { ok: false, error: error?.message || 'DATABASE_ERROR' }; }
}

export const systemAuditService = { recordAudit, health };
