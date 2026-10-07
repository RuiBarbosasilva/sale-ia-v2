// src/modules/mercadoLivre/controllers/syncController.ts
import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { mercadoLivreSyncService } from '../services/mercadoLivreSyncService';

export const syncItems = async (req: Request, res: Response) => {
  try {
    const account = await prisma.mercadoLivreAccount.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    });
    if (!account) return res.status(404).json({ success: false, error: 'MERCADO_LIVRE_ACCOUNT_NOT_FOUND' });

    const stats = await mercadoLivreSyncService.syncItems(account.id);
    return res.json({
      success: stats.success,
      message: stats.success ? 'Sincronização concluída' : 'Sincronização concluída com erros',
      stats: { totalFound: stats.totalFound, created: stats.created, updated: stats.updated, failed: stats.failed, syncedAt: stats.syncedAt },
      account: { id: account.id, nickname: account.nickname, mlUserId: account.mlUserId }
    });
  } catch (error) {
    console.error('[ML Sync API] Falha na sincronização', { requestId: (req as any).requestId, error });
    return res.status(500).json({ success: false, error: 'MERCADO_LIVRE_SYNC_ERROR', requestId: (req as any).requestId });
  }
};
