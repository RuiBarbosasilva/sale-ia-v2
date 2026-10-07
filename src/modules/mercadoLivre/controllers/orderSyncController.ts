
﻿// src/modules/mercadoLivre/controllers/orderSyncController.ts
import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { mercadoLivreOrderSyncService } from '../services/mercadoLivreOrderSyncService';

function boundedInt(value: unknown, fallback: number, min: number, max: number) {
  if (value === undefined) return fallback;
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) throw new Error('INVALID_PAGINATION');
  return n;
}

export const syncOrders = async (req: Request, res: Response) => {
  try {
    const account = await prisma.mercadoLivreAccount.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'desc' } });
    if (!account) return res.status(404).json({ success: false, error: 'MERCADO_LIVRE_ACCOUNT_NOT_FOUND' });

    const daysBack = boundedInt(req.query.daysBack, 90, 1, 365);
    const stats = await mercadoLivreOrderSyncService.syncOrders(account.id, { daysBack });

    return res.json({
      success: stats.success,
      message: stats.success ? 'Pedidos sincronizados com sucesso' : 'Sincronização concluída com erros',
      stats: { totalFound: stats.totalFound, created: stats.created, updated: stats.updated, failed: stats.failed, syncedAt: stats.syncedAt },
      account: { id: account.id, nickname: account.nickname, mlUserId: account.mlUserId }
    });
  } catch (error: unknown) {
    const code = error instanceof Error && error.message === 'INVALID_PAGINATION' ? 'INVALID_PAGINATION' : 'MERCADO_LIVRE_ORDERS_SYNC_ERROR';
    return res.status(code === 'INVALID_PAGINATION' ? 400 : 500).json({ success: false, error: code, requestId: (req as Request & { requestId?: string }).requestId });
  }
};

export const listOrders = async (req: Request, res: Response) => {
  try {
    const account = await prisma.mercadoLivreAccount.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'desc' } });
    if (!account) return res.status(404).json({ success: false, error: 'MERCADO_LIVRE_ACCOUNT_NOT_FOUND' });

    const page = boundedInt(req.query.page, 1, 1, 100000);
    const limit = boundedInt(req.query.limit, 50, 1, 100);
    const status = typeof req.query.status === 'string' && /^[a-z_]{1,40}$/i.test(req.query.status)
      ? req.query.status : undefined;

    const result = await mercadoLivreOrderSyncService.listOrders(account.id, { status, page, limit });
    return res.json({ success: true, account: { id: account.id, nickname: account.nickname, mlUserId: account.mlUserId }, ...result });
  } catch (error) {
    const code = error instanceof Error && error.message === 'INVALID_PAGINATION' ? 'INVALID_PAGINATION' : 'MERCADO_LIVRE_ORDERS_ERROR';
    return res.status(code === 'INVALID_PAGINATION' ? 400 : 500).json({ success: false, error: code, requestId: (req as Request & { requestId?: string }).requestId });
  }
};
