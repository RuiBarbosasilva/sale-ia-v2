// src/modules/mercadoLivre/controllers/syncController.ts
import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { mercadoLivreSyncService } from '../services/mercadoLivreSyncService';

export const syncItems = async (req: Request, res: Response) => {
  try {
    console.log('[ML Sync API] 🟢 Iniciando sincronização via endpoint...');

    // Buscar conta ativa
    const account = await prisma.mercadoLivreAccount.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Nenhuma conta Mercado Livre ativa encontrada'
      });
    }

    console.log(`[ML Sync API] ✅ Conta encontrada: ${account.nickname}`);

    // Executar sincronização
    const stats = await mercadoLivreSyncService.syncItems(account.id);

    // Retornar resultado
    res.json({
      success: stats.success,
      message: stats.success ? 'Sincronização concluída' : 'Sincronização concluída com erros',
      stats: {
        totalFound: stats.totalFound,
        created: stats.created,
        updated: stats.updated,
        failed: stats.failed,
        syncedAt: stats.syncedAt
      },
      account: {
        id: account.id,
        nickname: account.nickname,
        mlUserId: account.mlUserId
      }
    });

  } catch (error: any) {
    console.error('[ML Sync API] ❌ Erro:', error.message);
    res.status(500).json({
      success: false,
      message: 'Erro ao sincronizar anúncios',
      error: error.message
    });
  }
};
