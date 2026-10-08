// src/modules/mercadoLivre/services/listingService.ts
import { prisma } from '../lib/prisma';
import { MercadoLivreClient } from '../api/mercadoLivreClient';
import { tokenService } from '../auth/tokenService';

const MAX_LIMIT = 100;
const MAX_OFFSET = 100000;

function normalizePagination(limit: number, offset: number) {
  return {
    limit: Math.min(Math.max(Number.isFinite(limit) ? Math.trunc(limit) : 50, 1), MAX_LIMIT),
    offset: Math.min(Math.max(Number.isFinite(offset) ? Math.trunc(offset) : 0, 0), MAX_OFFSET),
  };
}

function validateAccountId(value: string) { if (typeof value !== 'string' || !value.trim() || value.length > 100) throw new Error('INVALID_MERCADO_LIVRE_ACCOUNT_ID'); return value.trim(); }
function validatePayload(value: unknown) { if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('INVALID_MERCADO_LIVRE_LISTING_PAYLOAD'); const raw = JSON.stringify(value); if (!raw || raw.length > 100000) throw new Error('MERCADO_LIVRE_LISTING_PAYLOAD_TOO_LARGE'); return value; }

function validateItemId(value: string) {
  if (!/^[A-Za-z0-9_-]{3,80}$/.test(value)) throw new Error('INVALID_MERCADO_LIVRE_ITEM_ID');
  return value;
}

export class ListingService {
  async getListings(accountId: string, limit: number = 50, offset: number = 0) {
    const accountKey = validateAccountId(accountId);
    const page = normalizePagination(limit, offset);
    const accessToken = await tokenService.getValidToken(accountKey);
    const client = new MercadoLivreClient(accessToken, () => tokenService.getValidToken(accountKey));

    const account = await prisma.mercadoLivreAccount.findUnique({ where: { id: accountKey } });
    if (!account || !account.isActive) throw new Error('ACCOUNT_NOT_FOUND');

    const response = await client.get<any>(`/users/${encodeURIComponent(account.mlUserId)}/items/search`, {
      search_type: 'scan',
      limit: page.limit,
      offset: page.offset
    });

    for (const itemId of response.results || []) {
      if (typeof itemId === 'string') await this.syncItem(accountKey, itemId);
    }

    return response;
  }

  async getItem(accountId: string, mlItemId: string) {
    const accountKey = validateAccountId(accountId);
    const itemId = validateItemId(mlItemId);
    const accessToken = await tokenService.getValidToken(accountKey);
    const client = new MercadoLivreClient(accessToken, () => tokenService.getValidToken(accountId));
    return await client.get<any>(`/items/${encodeURIComponent(itemId)}`);
  }

  async createListing(accountId: string, listingData: any) {
    const accountKey = validateAccountId(accountId);
    const payload = validatePayload(listingData);
    const accessToken = await tokenService.getValidToken(accountId);
    const client = new MercadoLivreClient(accessToken, () => tokenService.getValidToken(accountId));

    const response = await client.post<any>('/items', payload);
    if (response?.id) await this.syncItem(accountKey, response.id);
    return response;
  }

  async updateListing(accountId: string, mlItemId: string, updateData: any) {
    const accountKey = validateAccountId(accountId);
    const payload = validatePayload(updateData);
    const itemId = validateItemId(mlItemId);
    const accessToken = await tokenService.getValidToken(accountId);
    const client = new MercadoLivreClient(accessToken, () => tokenService.getValidToken(accountId));

    const response = await client.put<any>(`/items/${encodeURIComponent(itemId)}`, payload);
    await this.syncItem(accountKey, itemId);
    return response;
  }

  async changeStatus(accountId: string, mlItemId: string, status: 'paused' | 'active') {
    return this.updateListing(accountId, mlItemId, { status });
  }

  private async syncItem(accountId: string, mlItemId: string) {
    try {
      const itemId = validateItemId(mlItemId);
      const item = await this.getItem(accountId, itemId);
      await prisma.mercadoLivreItem.upsert({
        where: { mlItemId: itemId },
        update: {
          accountId,
          title: item.title,
          status: item.status,
          price: item.price,
          stock: item.available_quantity,
          permalink: item.permalink,
          lastSyncedAt: new Date()
        },
        create: {
          accountId,
          mlItemId: itemId,
          title: item.title,
          status: item.status,
          price: item.price,
          stock: item.available_quantity,
          permalink: item.permalink,
          lastSyncedAt: new Date()
        }
      });
    } catch (e: any) {
      console.error('[ML Sync] Falha ao sincronizar item', {
        accountId,
        itemId: typeof mlItemId === 'string' ? mlItemId : undefined,
        code: typeof e?.message === 'string' ? e.message : 'SYNC_FAILED'
      });
    }
  }
}

export const listingService = new ListingService();

