// src/services/prospecting/providers/businessProspectingManager.ts

import { BusinessProspectingProvider } from './businessProspectingProvider';
import { googlePlacesProvider } from './googlePlacesProvider';
import { BusinessSearchRequest, BusinessSearchResult, ProspectingProviderStatus } from '../../../types/prospecting.types';

type CachedDetails = {
  value: any;
  expiresAt: number;
};

export class BusinessProspectingManager {
  private providers: BusinessProspectingProvider[] = [googlePlacesProvider];
  private readonly detailsCache = new Map<string, CachedDetails>();
  private readonly detailsCacheTtlMs = 10 * 60 * 1000;
  private readonly detailsCacheMaxEntries = 1000;

  getStatus(): { provider: string; status: ProspectingProviderStatus }[] {
    return this.providers.map(p => ({ provider: p.name, status: p.getStatus() }));
  }

  getActiveProvider(): BusinessProspectingProvider | null {
    return this.providers.find(p => p.getStatus() === 'CONFIGURED') || null;
  }

  async searchBusinesses(request: BusinessSearchRequest): Promise<BusinessSearchResult> {
    const provider = this.getActiveProvider();
    if (!provider) {
      throw new Error('PROSPECTING_NOT_CONFIGURED: Nenhum provider de prospeccao configurado. Configure GOOGLE_PLACES_API_KEY no .env');
    }
    return provider.searchBusinesses(request);
  }

  async getBusinessDetails(placeId: string): Promise<any> {
    const normalizedPlaceId = String(placeId || '').trim();
    if (!normalizedPlaceId) return null;

    const provider = this.getActiveProvider();
    if (!provider || typeof provider.getBusinessDetails !== 'function') {
      return null;
    }

    const cached = this.detailsCache.get(normalizedPlaceId);
    if (cached) {
      if (cached.expiresAt > Date.now()) {
        return cached.value;
      }
      this.detailsCache.delete(normalizedPlaceId);
    }

    try {
      const details = await provider.getBusinessDetails(normalizedPlaceId);

      if (details) {
        if (this.detailsCache.size >= this.detailsCacheMaxEntries) {
          const oldestKey = this.detailsCache.keys().next().value;
          if (oldestKey) this.detailsCache.delete(oldestKey);
        }

        this.detailsCache.set(normalizedPlaceId, {
          value: details,
          expiresAt: Date.now() + this.detailsCacheTtlMs,
        });
      }

      return details;
    } catch (error: any) {
      console.error('[BusinessProspectingManager] getBusinessDetails failed:', error.message);
      return null;
    }
  }
}

export const businessProspectingManager = new BusinessProspectingManager();
