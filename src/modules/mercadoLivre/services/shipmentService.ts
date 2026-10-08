import { prisma } from '../lib/prisma';
import { MercadoLivreClient } from '../api/mercadoLivreClient';
import { tokenService } from '../auth/tokenService';

export interface ShipmentSyncStats {
  success: boolean;
  accountId: string;
  totalFound: number;
  created: number;
  updated: number;
  failed: number;
  skipped: number;
  syncedAt: Date;
  errors?: string[];
}

const safeId = (value: unknown, max = 100): string =>
  typeof value === 'string' || typeof value === 'number' ? String(value).trim().slice(0, max) : '';

const safeText = (value: unknown, max = 160): string =>
  typeof value === 'string' ? value.trim().slice(0, max) : '';

const safeError = (error: unknown): string =>
  error instanceof Error ? error.message.slice(0, 500) : 'UNKNOWN_ERROR';

const safeDateOrNull = (value: unknown): Date | null => {
  if (typeof value !== 'string') return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
};

const boundedInt = (value: unknown, fallback: number, max: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(1, Math.min(max, Math.floor(parsed))) : fallback;
};

export class ShipmentService {
  async getShipment(accountId: string, shipmentId: string) {
    const safeAccountId = safeId(accountId);
    const safeShipmentId = safeId(shipmentId);
    if (!safeAccountId) throw new Error('ACCOUNT_ID_REQUIRED');
    if (!safeShipmentId) throw new Error('SHIPMENT_ID_REQUIRED');

    const accessToken = await tokenService.getValidToken(safeAccountId);
    const client = new MercadoLivreClient(accessToken, () => tokenService.getValidToken(safeAccountId));
    const data = await client.getShipment<any>(safeShipmentId);

    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('INVALID_SHIPMENT_RESPONSE');

    await prisma.mercadoLivreShipment.upsert({
      where: { mlShipmentId: safeShipmentId },
      update: {
        status: safeText(data.status, 80) || 'unknown',
        trackingNumber: safeText(data.tracking_number, 120) || null
      },
      create: {
        accountId: safeAccountId,
        mlShipmentId: safeShipmentId,
        mlOrderId: safeId(data.order_id),
        status: safeText(data.status, 80) || 'unknown',
        trackingNumber: safeText(data.tracking_number, 120) || null,
        labelUrl: safeText(data.labels?.[0]?.url, 2048) || null,
        dateFirstPrinted: safeDateOrNull(data.date_first_printed)
      }
    });

    return data;
  }

  async getShipmentLabel(accountId: string, shipmentId: string) {
    const shipment = await this.getShipment(accountId, shipmentId);
    if (!Array.isArray(shipment.labels) || shipment.labels.length === 0) {
      throw new Error('MERCADO_LIVRE_LABEL_NOT_AVAILABLE');
    }

    const label = shipment.labels.find((item: any) => item && item.type === 'ZPL_10x15') || shipment.labels[0];
    if (!label || typeof label !== 'object' || !safeText(label.url, 2048)) {
      throw new Error('MERCADO_LIVRE_LABEL_INVALID');
    }

    return {
      url: safeText(label.url, 2048),
      format: safeText(label.type, 80) || 'UNKNOWN',
      dateFirstPrinted: shipment.date_first_printed || new Date().toISOString()
    };
  }

  async syncShipments(accountId: string): Promise<ShipmentSyncStats> {
    const safeAccountId = safeId(accountId);
    const stats: ShipmentSyncStats = {
      success: false,
      accountId: safeAccountId,
      totalFound: 0,
      created: 0,
      updated: 0,
      failed: 0,
      skipped: 0,
      syncedAt: new Date(),
      errors: []
    };

    try {
      if (!safeAccountId) throw new Error('ACCOUNT_ID_REQUIRED');

      const account = await prisma.mercadoLivreAccount.findUnique({ where: { id: safeAccountId } });
      if (!account) throw new Error('ACCOUNT_NOT_FOUND');

      const accessToken = await tokenService.getValidToken(safeAccountId);
      const client = new MercadoLivreClient(accessToken, () => tokenService.getValidToken(safeAccountId));

      const orders = await prisma.mercadoLivreOrder.findMany({
        where: { accountId: safeAccountId },
        select: { mlOrderId: true, status: true },
        orderBy: { lastSyncedAt: 'desc' },
        take: 5000
      });

      const shipmentIds = new Map<string, string>();
      for (const order of orders) {
        try {
          const orderId = safeId(order.mlOrderId);
          if (!orderId) {
            stats.skipped++;
            continue;
          }

          const orderData = await client.get<any>(`/orders/${encodeURIComponent(orderId)}`);
          const shippingId = safeId(orderData?.shipping?.id);
          if (!shippingId) {
            stats.skipped++;
            continue;
          }

          shipmentIds.set(orderId, shippingId);
          await new Promise(resolve => setTimeout(resolve, 150));
        } catch (error: unknown) {
          stats.failed++;
          if ((stats.errors?.length || 0) < 20) {
            stats.errors?.push(`Pedido ${safeId(order.mlOrderId) || 'UNKNOWN'}: ${safeError(error)}`);
          }
        }
      }

      stats.totalFound = shipmentIds.size;
      if (!stats.totalFound) {
        stats.success = stats.failed === 0;
        return stats;
      }

      for (const [mlOrderId, shipmentId] of shipmentIds.entries()) {
        try {
          const shipmentData = await client.getShipment<any>(shipmentId);
          if (!shipmentData || typeof shipmentData !== 'object' || Array.isArray(shipmentData) || !safeId(shipmentData.id)) {
            throw new Error('INVALID_SHIPMENT_RESPONSE');
          }

          const dbData = {
            accountId: safeAccountId,
            mlOrderId,
            status: safeText(shipmentData.status, 80) || 'unknown',
            trackingNumber: safeText(shipmentData.tracking_number, 120) || null,
            labelUrl: safeText(shipmentData.labels?.[0]?.url, 2048) || null,
            dateFirstPrinted: safeDateOrNull(shipmentData.date_first_printed)
          };

          const existing = await prisma.mercadoLivreShipment.findUnique({ where: { mlShipmentId: shipmentId } });
          if (existing) {
            await prisma.mercadoLivreShipment.update({ where: { mlShipmentId: shipmentId }, data: dbData });
            stats.updated++;
          } else {
            await prisma.mercadoLivreShipment.create({ data: { mlShipmentId: shipmentId, ...dbData } });
            stats.created++;
          }

          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error: unknown) {
          stats.failed++;
          if ((stats.errors?.length || 0) < 20) {
            stats.errors?.push(`Shipment ${shipmentId}: ${safeError(error)}`);
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

  async listShipments(
    accountId: string,
    filters?: { status?: string; page?: number; limit?: number }
  ) {
    const safeAccountId = safeId(accountId);
    if (!safeAccountId) throw new Error('ACCOUNT_ID_REQUIRED');

    const page = boundedInt(filters?.page, 1, 100000);
    const limit = boundedInt(filters?.limit, 50, 200);
    const status = safeText(filters?.status, 80);
    const where: { accountId: string; status?: string } = { accountId: safeAccountId };
    if (status) where.status = status;

    const shipments = await prisma.mercadoLivreShipment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: (page - 1) * limit
    });
    const total = await prisma.mercadoLivreShipment.count({ where });
    const statusCounts = await prisma.mercadoLivreShipment.groupBy({
      by: ['status'],
      where: { accountId: safeAccountId },
      _count: { status: true }
    });

    const statusMap: Record<string, number> = {};
    statusCounts.forEach(item => { statusMap[item.status] = item._count.status; });

    return {
      shipments: shipments.map(s => ({
        id: s.id,
        mlShipmentId: s.mlShipmentId,
        mlOrderId: s.mlOrderId,
        status: s.status,
        trackingNumber: s.trackingNumber,
        labelUrl: s.labelUrl,
        dateFirstPrinted: s.dateFirstPrinted,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      statusCounts: statusMap
    };
  }
}

export const shipmentService = new ShipmentService();
