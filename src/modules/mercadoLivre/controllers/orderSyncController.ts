// src/modules/mercadoLivre/controllers/orderSyncController.ts
import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { mercadoLivreOrderSyncService } from '../services/mercadoLivreOrderSyncService';

export const syncOrders = async (req: Request, res: Response) => {
  try {
    console.log('[ML Orders API] 🟢 Iniciando sincronização de pedidos via endpoint...');

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

    console.log(`[ML Orders API] ✅ Conta encontrada: ${account.nickname}`);

    // Extrair opções da query
    const daysBack = req.query.daysBack ? parseInt(req.query.daysBack as string) : 90;

    // Executar sincronização
    const stats = await mercadoLivreOrderSyncService.syncOrders(account.id, { daysBack });

    // Retornar resultado
    res.json({
      success: stats.success,
      message: stats.success ? 'Pedidos sincronizados com sucesso' : 'Sincronização concluída com erros',
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
    console.error('[ML Orders API] ❌ Erro:', error.message);
    res.status(500).json({
      success: false,
      message: 'Erro ao sincronizar pedidos',
      error: error.message
    });
  }
};

export const listOrders = async (req: Request, res: Response) => {
  try {
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

    // Extrair filtros da query
    const status = req.query.status as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    // Listar pedidos
    const result = await mercadoLivreOrderSyncService.listOrders(account.id, {
      status,
      page,
      limit
    });

    res.json({
      success: true,
      account: {
        id: account.id,
        nickname: account.nickname,
        mlUserId: account.mlUserId
      },
      ...result
    });

  } catch (error: any) {
    console.error('[ML Orders API] ❌ Erro ao listar pedidos:', error.message);
    res.status(500).json({
      success: false,
      message: 'Erro ao listar pedidos',
      error: error.message
    });
  }
};
