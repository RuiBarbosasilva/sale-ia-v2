// src/modules/mercadoLivre/services/listingService.ts
import { prisma } from '../lib/prisma';
import { MercadoLivreClient } from '../api/mercadoLivreClient';
import { tokenService } from '../auth/tokenService';

export class ListingService {
  async getListings(accountId: string, limit: number = 50, offset: number = 0) {
    const accessToken = await tokenService.getValidToken(accountId);
    const client = new MercadoLivreClient(accessToken, () => tokenService.getValidToken(accountId));
    
    const account = await prisma.mercadoLivreAccount.findUnique({ where: { id: accountId } });
    if (!account) throw new Error('ACCOUNT_NOT_FOUND');

    // Endpoint oficial para buscar itens do vendedor
    // Endpoint oficial ML: /users/{user_id}/items/search
    // Retorna array de mlItemIds do vendedor autenticado
    const response = await client.get<any>(`/users/${account.mlUserId}/items/search`, {
      search_type: 'scan',
      limit,
      offset
    });

    // Sincronização em background (simplificada para o exemplo)
    for (const itemId of response.results || []) {
       await this.syncItem(accountId, itemId);
    }

    return response;
  }

  async getItem(accountId: string, mlItemId: string) {
    const accessToken = await tokenService.getValidToken(accountId);
    const client = new MercadoLivreClient(accessToken, () => tokenService.getValidToken(accountId));
    return await client.get<any>(`/items/${mlItemId}`);
  }

  async createListing(accountId: string, listingData: any) {
    const accessToken = await tokenService.getValidToken(accountId);
    const client = new MercadoLivreClient(accessToken, () => tokenService.refreshToken(accountId, 'placeholder'));
    
    const response = await client.post<any>('/items', listingData);
    await this.syncItem(accountId, response.id);
    return response;
  }

  async updateListing(accountId: string, mlItemId: string, updateData: any) {
    const accessToken = await tokenService.getValidToken(accountId);
    const client = new MercadoLivreClient(accessToken, () => tokenService.refreshToken(accountId, 'placeholder'));
    
    // ML usa PUT para atualizar itens
    const response = await client.put<any>(`/items/${mlItemId}`, updateData);
    await this.syncItem(accountId, mlItemId);
    return response;
  }

  async changeStatus(accountId: string, mlItemId: string, status: 'paused' | 'active') {
    return this.updateListing(accountId, mlItemId, { status });
  }

  private async syncItem(accountId: string, mlItemId: string) {
    try {
      const item = await this.getItem(accountId, mlItemId);
      await prisma.mercadoLivreItem.upsert({
        where: { mlItemId },
        update: {
          title: item.title,
          status: item.status,
          price: item.price,
          stock: item.available_quantity,
          permalink: item.permalink,
          lastSyncedAt: new Date()
        },
        create: {
          accountId,
          mlItemId,
          title: item.title,
          status: item.status,
          price: item.price,
          stock: item.available_quantity,
          permalink: item.permalink,
          lastSyncedAt: new Date()
        }
      });
    } catch (e) {
      console.error(`[ML Sync] Falha ao sincronizar item ${mlItemId}`, e);
    }
  }
}
export const listingService = new ListingService();

