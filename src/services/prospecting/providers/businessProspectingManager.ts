// src/services/prospecting/providers/businessProspectingManager.ts

import { BusinessProspectingProvider } from './businessProspectingProvider';
import { googlePlacesProvider } from './googlePlacesProvider';
import { BusinessSearchRequest, BusinessSearchResult, ProspectingProviderStatus } from '../../../types/prospecting.types';

export class BusinessProspectingManager {
  private providers: BusinessProspectingProvider[] = [googlePlacesProvider];

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
    const provider = this.getActiveProvider();
    if (!provider || typeof provider.getBusinessDetails !== 'function') {
      return null;
    }
    try {
      return await provider.getBusinessDetails(placeId);
    } catch (error: any) {
      console.error('[BusinessProspectingManager] getBusinessDetails failed:', error.message);
      return null;
    }
  }
}

export const businessProspectingManager = new BusinessProspectingManager();