
﻿// src/modules/mercadoLivre/controllers/shipmentController.ts
import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { shipmentService } from '../services/shipmentService';

function boundedInt(value: unknown, fallback: number, min: number, max: number) {
  if (value === undefined) return fallback;
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) throw new Error('INVALID_PAGINATION');
  return n;
}
function validId(value: unknown) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,80}$/.test(value)) throw new Error('INVALID_SHIPMENT_ID');
  return value;
}
async function activeAccount() {
  return prisma.mercadoLivreAccount.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'desc' } });
}

export const syncShipments = async (req: Request, res: Response) => {
  try {
    const account = await activeAccount();
    if (!account) return res.status(404).json({ success: false, error: 'MERCADO_LIVRE_ACCOUNT_NOT_FOUND' });
    const stats = await shipmentService.syncShipments(account.id);
    return res.json({
      success: stats.success,
      message: stats.success ? 'Envios sincronizados com sucesso' : 'Sincronização concluída com erros',
      stats: { totalFound: stats.totalFound, created: stats.created, updated: stats.updated, skipped: stats.skipped, failed: stats.failed, syncedAt: stats.syncedAt },
      account: { id: account.id, nickname: account.nickname, mlUserId: account.mlUserId }
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'MERCADO_LIVRE_SHIPMENTS_SYNC_ERROR', requestId: (req as any).requestId });
  }
};

export const listShipments = async (req: Request, res: Response) => {
  try {
    const account = await activeAccount();
    if (!account) return res.status(404).json({ success: false, error: 'MERCADO_LIVRE_ACCOUNT_NOT_FOUND' });
    const page = boundedInt(req.query.page, 1, 1, 100000);
    const limit = boundedInt(req.query.limit, 50, 1, 100);
    const status = typeof req.query.status === 'string' && /^[a-z_]{1,40}$/i.test(req.query.status) ? req.query.status : undefined;
    const result = await shipmentService.listShipments(account.id, { status, page, limit });
    return res.json({ success: true, account: { id: account.id, nickname: account.nickname, mlUserId: account.mlUserId }, ...result });
  } catch (error) {
    const code = error instanceof Error && error.message === 'INVALID_PAGINATION' ? 'INVALID_PAGINATION' : 'MERCADO_LIVRE_SHIPMENTS_ERROR';
    return res.status(code === 'INVALID_PAGINATION' ? 400 : 500).json({ success: false, error: code, requestId: (req as any).requestId });
  }
};

export const getShipment = async (req: Request, res: Response) => {
  try {
    const id = validId(req.params.id);
    const account = await activeAccount();
    if (!account) return res.status(404).json({ error: 'MERCADO_LIVRE_ACCOUNT_NOT_FOUND' });
    return res.json(await shipmentService.getShipment(account.id, id));
  } catch (error) {
    const code = error instanceof Error && error.message === 'INVALID_SHIPMENT_ID' ? 'INVALID_SHIPMENT_ID' : 'MERCADO_LIVRE_SHIPMENT_ERROR';
    return res.status(code === 'INVALID_SHIPMENT_ID' ? 400 : 500).json({ error: code, requestId: (req as any).requestId });
  }
};

export const getShipmentLabel = async (req: Request, res: Response) => {
  try {
    const id = validId(req.params.id);
    const account = await activeAccount();
    if (!account) return res.status(404).json({ error: 'MERCADO_LIVRE_ACCOUNT_NOT_FOUND' });
    return res.json(await shipmentService.getShipmentLabel(account.id, id));
  } catch (error) {
    const code = error instanceof Error && error.message === 'INVALID_SHIPMENT_ID' ? 'INVALID_SHIPMENT_ID' : 'MERCADO_LIVRE_SHIPMENT_LABEL_ERROR';
    return res.status(code === 'INVALID_SHIPMENT_ID' ? 400 : 500).json({ error: code, requestId: (req as any).requestId });
  }
};
