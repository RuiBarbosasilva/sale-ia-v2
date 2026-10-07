// src/modules/mercadoLivre/services/shipmentService.ts
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

export class ShipmentService {
  /**
   * Obtém detalhes de UM shipment específico (método original - preservado)
   */
  async getShipment(accountId: string, shipmentId: string) {
    const accessToken = await tokenService.getValidToken(accountId);
    const client = new MercadoLivreClient(
      accessToken,
      () => tokenService.refreshToken(accountId, 'placeholder')
    );

    const data = await client.getShipment<any>(shipmentId);

    await prisma.mercadoLivreShipment.upsert({
      where: { mlShipmentId: String(shipmentId) },
      update: { status: data.status, trackingNumber: data.tracking_number },
      create: {
        accountId,
        mlShipmentId: String(shipmentId),
        mlOrderId: String(data.order_id),
        status: data.status,
        trackingNumber: data.tracking_number,
        labelUrl: data.labels?.[0]?.url || null,
        dateFirstPrinted: data.date_first_printed ? new Date(data.date_first_printed) : null
      }
    });

    return data;
  }

  /**
   * Obtém etiqueta de UM shipment específico (método original - preservado)
   */
  async getShipmentLabel(accountId: string, shipmentId: string) {
    const shipment = await this.getShipment(accountId, shipmentId);

    if (!shipment.labels || shipment.labels.length === 0) {
      throw new Error('MERCADO_LIVRE_LABEL_NOT_AVAILABLE');
    }

    const label = shipment.labels.find((l: any) => l.type === 'ZPL_10x15') || shipment.labels[0];

    return {
      url: label.url,
      format: label.type,
      dateFirstPrinted: shipment.date_first_printed || new Date().toISOString()
    };
  }

  /**
   * NOVO: Sincroniza TODOS os shipments dos pedidos da conta
   * Estratégia: para cada MercadoLivreOrder sincronizado, obtém shipping.id
   * via /orders/{mlOrderId} e depois chama /shipments/{id} para detalhes
   */
  async syncShipments(accountId: string): Promise<ShipmentSyncStats> {
    const stats: ShipmentSyncStats = {
      success: false,
      accountId,
      totalFound: 0,
      created: 0,
      updated: 0,
      failed: 0,
      skipped: 0,
      syncedAt: new Date(),
      errors: []
    };

    try {
      console.log('[ML Shipments] 🟢 Iniciando sincronização de envios...');

      // 1. Validar conta
      const account = await prisma.mercadoLivreAccount.findUnique({
        where: { id: accountId }
      });

      if (!account) {
        throw new Error('Conta não encontrada');
      }

      console.log(`[ML Shipments] ✅ Conta: ${account.nickname} (${account.mlUserId})`);

      // 2. Obter token válido
      const accessToken = await tokenService.getValidToken(accountId);
      const client = new MercadoLivreClient(
        accessToken,
        () => tokenService.refreshToken(accountId, 'placeholder')
      );

      // 3. Buscar todos os pedidos sincronizados
      const orders = await prisma.mercadoLivreOrder.findMany({
        where: { accountId },
        select: { mlOrderId: true, status: true }
      });

      console.log(`[ML Shipments] 📦 ${orders.length} pedidos encontrados para processar`);

      if (orders.length === 0) {
        console.log('[ML Shipments] ⚠️ Nenhum pedido sincronizado. Sincronize pedidos primeiro.');
        stats.success = true;
        return stats;
      }

      // 4. Para cada pedido, obter shipping.id e depois detalhes do shipment
      const shipmentIds = new Map<string, string>(); // mlOrderId -> shipmentId

      for (const order of orders) {
        try {
          // Buscar dados do pedido para obter shipping.id
          const orderData = await client.get<any>(`/orders/${order.mlOrderId}`);
          
          const shippingId = orderData?.shipping?.id;
          
          if (!shippingId) {
            console.log(`[ML Shipments] ⏭️  Pedido ${order.mlOrderId} sem shipment (status: ${order.status})`);
            stats.skipped++;
            continue;
          }

          shipmentIds.set(order.mlOrderId, String(shippingId));
          
          // Pequeno delay para respeitar rate limit
          await new Promise(resolve => setTimeout(resolve, 150));

        } catch (error: any) {
          console.error(`[ML Shipments] ❌ Erro ao buscar pedido ${order.mlOrderId}:`, error.message);
          stats.failed++;
          stats.errors?.push(`Pedido ${order.mlOrderId}: ${error.message}`);
        }
      }

      stats.totalFound = shipmentIds.size;
      console.log(`[ML Shipments] 📦 ${shipmentIds.size} shipments únicos encontrados`);

      if (shipmentIds.size === 0) {
        console.log('[ML Shipments] ⚠️ Nenhum shipment encontrado nos pedidos');
        stats.success = true;
        return stats;
      }

      // 5. Para cada shipment, buscar detalhes e fazer upsert
      for (const [mlOrderId, shipmentId] of shipmentIds.entries()) {
        try {
          console.log(`[ML Shipments] 🔍 Buscando detalhes do shipment ${shipmentId}...`);
          
          // Usa método especializado com x-format-new: true
          const shipmentData = await client.getShipment<any>(shipmentId);

          if (!shipmentData || !shipmentData.id) {
            throw new Error('Resposta inválida da API');
          }

          // Preparar dados para upsert
          const dbData = {
            accountId,
            mlOrderId: mlOrderId,
            status: shipmentData.status || 'unknown',
            trackingNumber: shipmentData.tracking_number || null,
            labelUrl: shipmentData.labels?.[0]?.url || null,
            dateFirstPrinted: shipmentData.date_first_printed 
              ? new Date(shipmentData.date_first_printed) 
              : null
          };

          // Verificar se já existe
          const existing = await prisma.mercadoLivreShipment.findUnique({
            where: { mlShipmentId: String(shipmentId) }
          });

          if (existing) {
            await prisma.mercadoLivreShipment.update({
              where: { mlShipmentId: String(shipmentId) },
              data: dbData
            });
            stats.updated++;
          } else {
            await prisma.mercadoLivreShipment.create({
              data: {
                mlShipmentId: String(shipmentId),
                ...dbData
              }
            });
            stats.created++;
          }

          // Delay entre requisições
          await new Promise(resolve => setTimeout(resolve, 200));

        } catch (error: any) {
          console.error(`[ML Shipments] ❌ Erro no shipment ${shipmentId}:`, error.message);
          stats.failed++;
          stats.errors?.push(`Shipment ${shipmentId}: ${error.message}`);
        }
      }

      stats.success = stats.failed === 0;
      console.log('[ML Shipments] ' + (stats.success ? '✅ Sincronização concluída' : '⚠️ Sincronização concluída com falhas parciais'));
      console.log(`[ML Shipments] 📊 Estatísticas:`);
      console.log(`[ML Shipments]   Total encontrados: ${stats.totalFound}`);
      console.log(`[ML Shipments]   Criados: ${stats.created}`);
      console.log(`[ML Shipments]   Atualizados: ${stats.updated}`);
      console.log(`[ML Shipments]   Pulados (sem shipment): ${stats.skipped}`);
      console.log(`[ML Shipments]   Falhas: ${stats.failed}`);

      return stats;

    } catch (error: any) {
      console.error('[ML Shipments] ❌ Erro crítico:', error.message);
      stats.success = false;
      stats.errors?.push(error.message);
      return stats;
    }
  }

  /**
   * NOVO: Lista shipments da conta a partir do banco local
   */
  async listShipments(
    accountId: string,
    filters?: { status?: string; page?: number; limit?: number }
  ) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const offset = (page - 1) * limit;

    const where: any = { accountId };
    if (filters?.status) {
      where.status = filters.status;
    }

    const shipments = await prisma.mercadoLivreShipment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    });

    const total = await prisma.mercadoLivreShipment.count({ where });

    // Contagens por status
    const statusCounts = await prisma.mercadoLivreShipment.groupBy({
      by: ['status'],
      where: { accountId },
      _count: { status: true }
    });

    const statusMap: Record<string, number> = {};
    statusCounts.forEach(s => {
      statusMap[s.status] = s._count.status;
    });

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
