// src/modules/mercadoLivre/controllers/metricsController.ts
import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export interface MLMetricsData {
  account: {
    id: string;
    nickname: string;
    mlUserId: string;
    isActive: boolean;
  };
  items: {
    total: number;
    active: number;
    paused: number;
    totalStock: number;
  };
  orders: {
    total: number;
    paid: number;
    cancelled: number;
    revenue: number;
  };
  shipments: {
    total: number;
    byStatus: Record<string, number>;
  };
  lastSync: Date | null;
}

/**
 * Função pura que retorna as métricas do Mercado Livre.
 * Pode ser chamada por qualquer endpoint ou serviço interno.
 */
export async function fetchMLMetrics(): Promise<MLMetricsData | null> {
  const account = await prisma.mercadoLivreAccount.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' }
  });

  if (!account) {
    return null;
  }

  const [
    totalItems,
    activeItems,
    pausedItems,
    stockResult,
    totalOrders,
    paidOrders,
    cancelledOrders,
    revenueResult,
    lastItemSync,
    lastOrderSync,
    totalShipments,
    shipmentsByStatus
  ] = await Promise.all([
    prisma.mercadoLivreItem.count({ where: { accountId: account.id } }),
    prisma.mercadoLivreItem.count({ where: { accountId: account.id, status: 'active' } }),
    prisma.mercadoLivreItem.count({ where: { accountId: account.id, status: 'paused' } }),
    prisma.mercadoLivreItem.aggregate({ where: { accountId: account.id }, _sum: { stock: true } }),
    prisma.mercadoLivreOrder.count({ where: { accountId: account.id } }),
    prisma.mercadoLivreOrder.count({ where: { accountId: account.id, status: 'paid' } }),
    prisma.mercadoLivreOrder.count({ where: { accountId: account.id, status: 'cancelled' } }),
    prisma.mercadoLivreOrder.aggregate({ where: { accountId: account.id, status: 'paid' }, _sum: { totalAmount: true } }),
    prisma.mercadoLivreItem.findFirst({ where: { accountId: account.id }, orderBy: { lastSyncedAt: 'desc' }, select: { lastSyncedAt: true } }),
    prisma.mercadoLivreOrder.findFirst({ where: { accountId: account.id }, orderBy: { lastSyncedAt: 'desc' }, select: { lastSyncedAt: true } }),
    prisma.mercadoLivreShipment.count({ where: { accountId: account.id } }),
    prisma.mercadoLivreShipment.groupBy({ by: ['status'], where: { accountId: account.id }, _count: { status: true } })
  ]);

  const syncDates = [lastItemSync?.lastSyncedAt, lastOrderSync?.lastSyncedAt].filter((date): date is Date => Boolean(date));
  const lastSync = syncDates.length
    ? new Date(Math.max(...syncDates.map((date) => date.getTime())))
    : null;

  return {
    account: {
      id: account.id,
      nickname: account.nickname,
      mlUserId: account.mlUserId,
      isActive: account.isActive
    },
    items: {
      total: totalItems,
      active: activeItems,
      paused: pausedItems,
      totalStock: stockResult._sum.stock || 0
    },
    orders: {
      total: totalOrders,
      paid: paidOrders,
      cancelled: cancelledOrders,
      revenue: Number(revenueResult._sum.totalAmount || 0)
    },
    shipments: {
      total: totalShipments,
      byStatus: shipmentsByStatus.reduce((acc, s) => ({ ...acc, [s.status]: s._count.status }), {} as Record<string, number>)
    },
    lastSync
  };
}

export const getMetrics = async (_req: Request, res: Response) => {
  try {
    console.log('[ML Metrics] 🟢 Buscando métricas...');

    const metrics = await fetchMLMetrics();

    if (!metrics) {
      return res.status(404).json({
        success: false,
        message: 'Nenhuma conta Mercado Livre ativa encontrada'
      });
    }

    console.log('[ML Metrics] ✅ Métricas calculadas:', {
      items: metrics.items.total,
      orders: metrics.orders.total,
      revenue: metrics.orders.revenue
    });

    res.json({ success: true, data: metrics });
  } catch (error: any) {
    console.error('[ML Metrics] ❌ Erro ao buscar métricas:', error.message);
    res.status(500).json({
      success: false,
      message: 'Erro ao carregar métricas',
      error: error.message
    });
  }
};

