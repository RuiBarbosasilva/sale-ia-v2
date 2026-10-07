// src/modules/mercadoLivre/services/mercadoLivreOrderSyncService.ts
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

export class MercadoLivreOrderSyncService {
  /**
   * Sincroniza pedidos reais do Mercado Livre
   */
  async syncOrders(accountId: string, options?: { daysBack?: number }): Promise<OrderSyncStats> {
    const stats: OrderSyncStats = {
      success: false,
      accountId,
      totalFound: 0,
      created: 0,
      updated: 0,
      failed: 0,
      syncedAt: new Date(),
      errors: []
    };

    try {
      console.log('[ML Orders Sync] 🟢 Iniciando sincronização de pedidos...');

      // 1. Buscar conta
      const account = await prisma.mercadoLivreAccount.findUnique({
        where: { id: accountId }
      });

      if (!account) {
        throw new Error('Conta não encontrada');
      }

      console.log(`[ML Orders Sync] ✅ Conta encontrada: ${account.nickname} (${account.mlUserId})`);

      // 2. Obter token válido
      const accessToken = await tokenService.getValidToken(accountId);
      const client = new MercadoLivreClient(
        accessToken,
        () => tokenService.getValidToken(accountId)
      );

      // 3. Definir período de busca (últimos N dias ou histórico)
      const daysBack = options?.daysBack || 90; // Padrão: últimos 90 dias
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - daysBack);
      const fromDateStr = fromDate.toISOString();

      console.log(`[ML Orders Sync] 📅 Buscando pedidos desde: ${fromDateStr}`);

      // 4. Buscar pedidos com paginação
      const allOrders: any[] = [];
      let offset = 0;
      const limit = 50;
      let hasMore = true;

      console.log('[ML Orders Sync] 📦 Buscando pedidos...');

      while (hasMore) {
        // Endpoint oficial: /orders/search?seller={seller_id}&order.date_last_updated.from={date}
        const endpoint = '/orders/search';
        const params = {
          seller: account.mlUserId,
          'order.date_last_updated.from': fromDateStr,
          limit,
          offset,
          sort: 'date_desc'
        };

        console.log(`[ML Orders Sync]   Chamando: GET ${endpoint}`, { offset, limit });

        try {
          const searchResponse = await client.get<any>(endpoint, params);

          console.log(`[ML Orders Sync]   Resposta:`, {
            total: searchResponse.paging?.total,
            results: searchResponse.results?.length || 0
          });

          const orders = searchResponse.results || [];
          
          if (!Array.isArray(orders)) {
            console.error('[ML Orders Sync] ❌ results não é um array');
            throw new Error('Resposta inválida da API');
          }

          allOrders.push(...orders);
          console.log(`[ML Orders Sync]   Lote ${offset / limit + 1}: ${orders.length} pedidos`);

          if (orders.length < limit) {
            hasMore = false;
          } else {
            offset += limit;
          }

          await new Promise(resolve => setTimeout(resolve, 300));

        } catch (error: any) {
          console.error(`[ML Orders Sync] ❌ Erro na busca (offset ${offset}):`, {
            message: error.message,
            status: error.response?.status,
            data: error.response?.data
          });
          
          throw error;
        }
      }

      stats.totalFound = allOrders.length;
      console.log(`[ML Orders Sync] ✅ Total de ${stats.totalFound} pedidos encontrados`);

      if (stats.totalFound === 0) {
        console.log('[ML Orders Sync] ⚠️ Nenhum pedido encontrado no período');
        stats.success = true;
        return stats;
      }

      // 5. Processar cada pedido e fazer upsert
      console.log('[ML Orders Sync] 🔄 Processando pedidos...');

      for (let i = 0; i < allOrders.length; i++) {
        const orderData = allOrders[i];
        
        try {
          const orderId = String(orderData.id);
          
          if (!orderId) {
            console.error('[ML Orders Sync] ❌ Pedido sem ID');
            stats.failed++;
            continue;
          }

          // Mapear dados do pedido
          const dbData = {
            accountId,
            mlOrderId: orderId,
            status: orderData.status || 'unknown',
            totalAmount: parseFloat(orderData.total_amount) || 0,
            dateCreated: orderData.date_created ? new Date(orderData.date_created) : new Date(),
            lastSyncedAt: new Date()
          };

          // Upsert no banco
          const existingOrder = await prisma.mercadoLivreOrder.findUnique({
            where: { mlOrderId: orderId }
          });

          if (existingOrder) {
            await prisma.mercadoLivreOrder.update({
              where: { mlOrderId: orderId },
              data: dbData
            });
            stats.updated++;
          } else {
            await prisma.mercadoLivreOrder.create({
              data: {
                mlOrderId: orderId,
                ...dbData
              }
            });
            stats.created++;
          }

          // Log de progresso a cada 10 pedidos
          if ((i + 1) % 10 === 0) {
            console.log(`[ML Orders Sync]   Progresso: ${i + 1}/${allOrders.length}`);
          }

        } catch (orderError: any) {
          console.error(`[ML Orders Sync] ❌ Erro ao processar pedido ${orderData?.id}:`, orderError.message);
          stats.failed++;
          stats.errors?.push(`Pedido ${orderData?.id}: ${orderError.message}`);
        }
      }

      stats.success = stats.failed === 0;
      console.log('[ML Orders Sync] ' + (stats.success ? '✅ Sincronização concluída com sucesso' : '⚠️ Sincronização concluída com falhas parciais'));
      console.log(`[ML Orders Sync] 📊 Estatísticas:`);
      console.log(`[ML Orders Sync]   Total encontrados: ${stats.totalFound}`);
      console.log(`[ML Orders Sync]   Criados: ${stats.created}`);
      console.log(`[ML Orders Sync]   Atualizados: ${stats.updated}`);
      console.log(`[ML Orders Sync]   Falhas: ${stats.failed}`);

      return stats;

    } catch (error: any) {
      console.error('[ML Orders Sync] ❌ Erro crítico na sincronização:', {
        message: error.message,
        stack: error.stack
      });
      stats.success = false;
      stats.errors?.push(error.message);
      return stats;
    }
  }

  /**
   * Lista pedidos sincronizados do banco local
   */
  async listOrders(
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

    const orders = await prisma.mercadoLivreOrder.findMany({
      where,
      orderBy: { dateCreated: 'desc' },
      take: limit,
      skip: offset
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
