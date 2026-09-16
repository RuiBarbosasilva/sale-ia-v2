// src/modules/mercadoLivre/orders/orderSyncService.ts

import { MercadoLivreClient } from '../api/mercadoLivreClient';
// import { prisma } from '@/core/database';
// import { eventBus } from '@/core/eventBus';

export class OrderSyncService {
  private client: MercadoLivreClient;

  constructor(client: MercadoLivreClient) {
    this.client = client;
  }

  async syncOrders(sellerId: string, offset: number = 0, limit: number = 50) {
    try {
      const response = await this.client.get<any>(`/orders/search`, {
        seller: sellerId,
        offset,
        limit,
        'order.date_last_updated.from': new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Últimas 24h
      });

      const orders = response.results || [];

      for (const order of orders) {
        await this.upsertOrder(order);
      }

      return { success: true, count: orders.length };
    } catch (error) {
      // logger.error('[OrderSync] Falha na sincronização', error);
      throw error;
    }
  }

  private async upsertOrder(mlOrder: any) {
    // TODO: Implementar upsert no Prisma
    // 1. Verificar se mlOrderId já existe.
    // 2. Se existir, atualizar status e totalAmount.
    // 3. Se não, criar novo registro e emitir evento ORDER_CREATED para o Core.
    /*
    await prisma.mercadoLivreOrder.upsert({
      where: { mlOrderId: mlOrder.id },
      update: { status: mlOrder.status, totalAmount: mlOrder.total_amount },
      create: { ... }
    });
    */
    // eventBus.emit('ORDER_UPDATED', { marketplace: 'MERCADOLIVRE', orderId: mlOrder.id });
  }
}

export class ShipmentService {
  private client: MercadoLivreClient;

  constructor(client: MercadoLivreClient) {
    this.client = client;
  }

  async getLabel(shipmentId: string) {
    // A documentação oficial exige o header x-format-new: true, já tratado no client.getShipment
    const shipment = await this.client.getShipment<any>(shipmentId);
    
    if (!shipment.labels) {
      throw new Error('LABEL_NOT_AVAILABLE');
    }

    return {
      url: shipment.labels.find((l: any) => l.type === 'ZPL_10x15')?.url || shipment.labels[0].url,
      format: 'ZPL_10x15',
      dateFirstPrinted: shipment.date_first_printed || new Date().toISOString()
    };
  }
}
