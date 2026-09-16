// src/modules/mercadoLivre/controllers/itemsController.ts
import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { mercadoLivreSyncService } from '../services/mercadoLivreSyncService';

export const listItems = async (req: Request, res: Response) => {
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

    // Extrair parâmetros de paginação
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    // Listar itens sincronizados
    const result = await mercadoLivreSyncService.listItems(account.id, limit, offset);

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
    console.error('[ML Items] ❌ Erro:', error.message);
    res.status(500).json({
      success: false,
      message: 'Erro ao listar anúncios',
      error: error.message
    });
  }
};
