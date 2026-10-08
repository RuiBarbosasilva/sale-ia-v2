import { prisma } from '../lib/prisma';
import { MercadoLivreClient } from '../api/mercadoLivreClient';
import { tokenService } from '../auth/tokenService';

export interface OrderSyncStats {
  success: boolean;
  accountId: string;
  totalFound: number;
  created: number;
  updated: number;
  failed: number;
  syncedAt: Date;
  errors?: string[];
}

const boundedPositiveInt = (value: unknown, fallback: number, max: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(1, Math.min(max, Math.floor(parsed))) : fallback;
};

const safeDate = (value: unknown, fallback = new Date()): Date => {
  if (typeof value !== 'string' && !(value instanceof Date)) return fallback;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : fallback;
};

const safeError = (error: unknown): string =>
  error instanceof Error ? error.message.slice(0, 500) : 'UNKNOWN_ERROR';

export class MercadoLivreOrderSyncService {
  async syncOrders(accountId: string, options?: { daysBack?: number }): Promise<OrderSyncStats> {
    const safeAccountId = typeof accountId === 'string' ? accountId.trim().slice(0, 100) : '';
    const stats: OrderSyncStats = {
      success: false,
      accountId: safeAccountId,
      totalFound: 0,
      created: 0,
      updated: 0,
      failed: 0,
      syncedAt: new Date(),
      errors: []
    };

    try {
      if (!safeAccountId) throw new Error('ACCOUNT_ID_REQUIRED');

      const account = await prisma.mercadoLivreAccount.findUnique({ where: { id: safeAccountId } });
      if (!account) throw new Error('ACCOUNT_NOT_FOUND');

      const accessToken = await tokenService.getValidToken(safeAccountId);
      const client = new MercadoLivreClient(accessToken, () => tokenService.getValidToken(safeAccountId));

      const daysBack = boundedPositiveInt(options?.daysBack, 90, 3650);
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - daysBack);
      const fromDateStr = fromDate.toISOString();

      const allOrders: unknown[] = [];
      let offset = 0;
      const limit = 50;
      let hasMore = true;
      const maxOrders = 5000;

      while (hasMore && allOrders.length < maxOrders) {
        const searchResponse = await client.get<any>('/orders/search', {
          seller: account.mlUserId,
          'order.date_last_updated.from': fromDateStr,
          limit,
          offset,
          sort: 'date_desc'
        });

        const orders = searchResponse?.results;
        if (!Array.isArray(orders)) throw new Error('INVALID_ORDERS_RESPONSE');

        allOrders.push(...orders.slice(0, maxOrders - allOrders.length));
        hasMore = orders.length === limit;
        offset += limit;

        if (hasMore) await new Promise(resolve => setTimeout(resolve, 300));
      }

      stats.totalFound = allOrders.length;
      if (!stats.totalFound) {
        stats.success = true;
        return stats;
      }

      for (const rawOrder of allOrders) {
        try {
          if (!rawOrder || typeof rawOrder !== 'object' || Array.isArray(rawOrder)) {
            stats.failed++;
            continue;
          }

          const orderData = rawOrder as Record<string, unknown>;
          const rawId = orderData.id;
          if (rawId === undefined || rawId === null || String(rawId).trim() === '') {
            stats.failed++;
            continue;
          }

          const orderId = String(rawId).trim().slice(0, 100);
          const status = typeof orderData.status === 'string' ? orderData.status.trim().slice(0, 80) || 'unknown' : 'unknown';
          const rawAmount = Number(orderData.total_amount);
          const totalAmount = Number.isFinite(rawAmount) && rawAmount >= 0 ? rawAmount : 0;
          const dateCreated = safeDate(orderData.date_created);

          const dbData = {
            accountId: safeAccountId,
            mlOrderId: orderId,
            status,
            totalAmount,
            dateCreated,
            lastSyncedAt: new Date()
          };

          const existingOrder = await prisma.mercadoLivreOrder.findUnique({ where: { mlOrderId: orderId } });
          if (existingOrder) {
            await prisma.mercadoLivreOrder.update({ where: { mlOrderId: orderId }, data: dbData });
            stats.updated++;
          } else {
            await prisma.mercadoLivreOrder.create({ data: dbData });
            stats.created++;
          }
        } catch (orderError: unknown) {
          stats.failed++;
          if ((stats.errors?.length || 0) < 20) {
            stats.errors?.push(`Pedido ${typeof (rawOrder as any)?.id === 'undefined' ? 'UNKNOWN' : String((rawOrder as any).id).slice(0, 100)}: ${safeError(orderError)}`);
          }
        }
      }

      stats.success = stats.failed === 0;
      return stats;
    } catch (error: unknown) {
      stats.success = false;
      stats.errors?.push(safeError(error));
      return stats;
    }
  }

  async listOrders(
    accountId: string,
    filters?: { status?: string; page?: number; limit?: number }
  ) {
    const safeAccountId = typeof accountId === 'string' ? accountId.trim().slice(0, 100) : '';
    if (!safeAccountId) throw new Error('ACCOUNT_ID_REQUIRED');

    const page = boundedPositiveInt(filters?.page, 1, 100000);
    const limit = boundedPositiveInt(filters?.limit, 50, 200);
    const status = typeof filters?.status === 'string' ? filters.status.trim().slice(0, 80) : '';

    const where: { accountId: string; status?: string } = { accountId: safeAccountId };
    if (status) where.status = status;

    const orders = await prisma.mercadoLivreOrder.findMany({
      where,
      orderBy: { dateCreated: 'desc' },
      take: limit,
      skip: (page - 1) * limit
    });
    const total = await prisma.mercadoLivreOrder.count({ where });

    return {
      orders: orders.map(order => ({
        id: order.id,
        mlOrderId: order.mlOrderId,
        status: order.status,
        totalAmount: order.totalAmount,
        dateCreated: order.dateCreated,
        lastSyncedAt: order.lastSyncedAt
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }
}

export const mercadoLivreOrderSyncService = new MercadoLivreOrderSyncService();
