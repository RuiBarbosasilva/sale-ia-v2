// src/services/prospecting/providers/businessProspectingProvider.ts

import { BusinessSearchRequest, BusinessSearchResult, ProspectingProviderStatus } from '../../../types/prospecting.types';

export interface BusinessProspectingProvider {
  readonly name: string;
  getStatus(): ProspectingProviderStatus;
  searchBusinesses(request: BusinessSearchRequest): Promise<BusinessSearchResult>;
  getBusinessDetails?(placeId: string): Promise<any>;
  getBusinessPhotos?(placeId: string): Promise<any[]>;
}