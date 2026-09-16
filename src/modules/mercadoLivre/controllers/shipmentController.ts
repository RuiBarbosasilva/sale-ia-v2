// src/modules/mercadoLivre/controllers/shipmentController.ts
import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { shipmentService } from '../services/shipmentService';

/**
 * NOVO: Dispara sincronização em massa de shipments
 * POST /api/mercadolivre/sync/shipments
 */
export const syncShipments = async (req: Request, res: Response) => {
  try {
    console.log('[ML Shipments API] 🟢 Iniciando sincronização via endpoint...');

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

    console.log(`[ML Shipments API] ✅ Conta: ${account.nickname}`);

    // Executar sincronização
    const stats = await shipmentService.syncShipments(account.id);

    res.json({
      success: stats.success,
      message: stats.success 
        ? 'Envios sincronizados com sucesso' 
        : 'Sincronização concluída com erros',
      stats: {
        totalFound: stats.totalFound,
        created: stats.created,
        updated: stats.updated,
        skipped: stats.skipped,
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
    console.error('[ML Shipments API] ❌ Erro:', error.message);
    res.status(500).json({
      success: false,
      message: 'Erro ao sincronizar envios',
      error: error.message
    });
  }
};

/**
 * NOVO: Lista shipments do banco local
 * GET /api/mercadolivre/shipments
 */
export const listShipments = async (req: Request, res: Response) => {
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

    // Extrair filtros
    const status = req.query.status as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const result = await shipmentService.listShipments(account.id, {
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
    console.error('[ML Shipments API] ❌ Erro ao listar:', error.message);
    res.status(500).json({
      success: false,
      message: 'Erro ao listar envios',
      error: error.message
    });
  }
};

/**
 * ORIGINAL: Obtém detalhes de UM shipment específico (preservado)
 * GET /api/mercadolivre/shipments/:id
 */
export const getShipment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const account = await prisma.mercadoLivreAccount.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    });

    if (!account) {
      return res.status(404).json({ error: 'Conta não encontrada' });
    }

    const data = await shipmentService.getShipment(account.id, id);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * ORIGINAL: Obtém etiqueta de UM shipment específico (preservado)
 * GET /api/mercadolivre/shipments/:id/label
 */
export const getShipmentLabel = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const account = await prisma.mercadoLivreAccount.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    });

    if (!account) {
      return res.status(404).json({ error: 'Conta não encontrada' });
    }

    const data = await shipmentService.getShipmentLabel(account.id, id);
    res.json(data);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};
