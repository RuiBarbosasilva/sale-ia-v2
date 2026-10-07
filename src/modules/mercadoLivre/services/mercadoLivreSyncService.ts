// src/modules/mercadoLivre/services/mercadoLivreSyncService.ts
import { prisma } from '../lib/prisma';
import { MercadoLivreClient } from '../api/mercadoLivreClient';
import { tokenService } from '../auth/tokenService';

export interface SyncStats {
  success: boolean;
  accountId: string;
  totalFound: number;
  created: number;
  updated: number;
  failed: number;
  syncedAt: Date;
  errors?: string[];
}

export class MercadoLivreSyncService {
  async syncItems(accountId: string): Promise<SyncStats> {
    const stats: SyncStats = {
      success: false, accountId, totalFound: 0, created: 0, updated: 0,
      failed: 0, syncedAt: new Date(), errors: []
    };

    try {
      console.log('[ML Sync] 🟢 Iniciando sincronização de anúncios...');
      const account = await prisma.mercadoLivreAccount.findUnique({ where: { id: accountId } });
      if (!account) throw new Error('Conta não encontrada');

      const accessToken = await tokenService.getValidToken(accountId);
      const client = new MercadoLivreClient(
        accessToken,
        () => tokenService.getValidToken(accountId)
      );

      const itemIds: string[] = [];
      let offset = 0;
      const limit = 50;
      let hasMore = true;

      while (hasMore) {
        const searchResponse = await client.get<any>(`/users/${account.mlUserId}/items/search`, { limit, offset });
        const ids = searchResponse.results || [];
        itemIds.push(...ids);
        if (ids.length < limit) { hasMore = false; } else { offset += limit; }
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      stats.totalFound = itemIds.length;

      const BATCH_SIZE = 20;
      for (let i = 0; i < itemIds.length; i += BATCH_SIZE) {
        const batch = itemIds.slice(i, i + BATCH_SIZE);
        try {
          const itemsResponse = await client.get<any>(`/items?ids=${batch.join(',')}`);
          const itemsArray = Array.isArray(itemsResponse) ? itemsResponse : [itemsResponse];
          for (const itemData of itemsArray) {
            try {
              const item = itemData.body || itemData;
              if (!item.id) { stats.failed++; continue; }
              const action = await this.upsertItemFromApi(accountId, item);
              if (action === 'created') stats.created++; else stats.updated++;
            } catch (itemError: any) {
              stats.failed++;
              stats.errors?.push(itemError.message);
            }
          }
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (batchError: any) {
          stats.failed += batch.length;
          stats.errors?.push(batchError.message);
        }
      }

      stats.success = stats.failed === 0;
      return stats;
    } catch (error: any) {
      stats.success = false;
      stats.errors?.push(error.message);
      return stats;
    }
  }

  /**
   * NOVO: sincroniza UM item real consultando a API do Mercado Livre.
   * Reutilizado pelo Webhook Worker.
   */
  async syncSingleItem(accountId: string, mlItemId: string): Promise<{ action: 'created' | 'updated' }> {
    const account = await prisma.mercadoLivreAccount.findUnique({ where: { id: accountId } });
    if (!account) throw new Error('Conta não encontrada');

    const accessToken = await tokenService.getValidToken(accountId);
    const client = new MercadoLivreClient(
      accessToken,
      () => tokenService.getValidToken(accountId)
    );

    const item = await client.get<any>(`/items/${mlItemId}`);
    if (!item || !item.id) throw new Error('Resposta inválida da API para item ' + mlItemId);

    const action = await this.upsertItemFromApi(accountId, item);
    return { action };
  }

  /**
   * Upsert idempotente por mlItemId (usado pelo sync em lote E pelo worker).
   */
  private async upsertItemFromApi(accountId: string, item: any): Promise<'created' | 'updated'> {
    const itemId = String(item.id);
    const dbData = {
      accountId,
      title: item.title,
      status: item.status,
      price: item.price,
      stock: item.available_quantity,
      permalink: item.permalink,
      lastSyncedAt: new Date()
    };

    const existing = await prisma.mercadoLivreItem.findUnique({ where: { mlItemId: itemId } });
    if (existing) {
      await prisma.mercadoLivreItem.update({ where: { mlItemId: itemId }, data: dbData });
      return 'updated';
    }
    await prisma.mercadoLivreItem.create({ data: { mlItemId: itemId, ...dbData } });
    return 'created';
  }

  async listItems(accountId: string, limit: number = 50, offset: number = 0) {
    const items = await prisma.mercadoLivreItem.findMany({
      where: { accountId },
      orderBy: { lastSyncedAt: 'desc' },
      take: limit,
      skip: offset
    });
    const total = await prisma.mercadoLivreItem.count({ where: { accountId } });
    return {
      items: items.map(item => ({
        mlItemId: item.mlItemId, title: item.title, status: item.status,
        price: item.price, stock: item.stock, permalink: item.permalink,
        lastSyncedAt: item.lastSyncedAt
      })),
      total, limit, offset
    };
  }
}

export const mercadoLivreSyncService = new MercadoLivreSyncService();
