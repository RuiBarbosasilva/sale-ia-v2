import 'dotenv/config';
// src/services/prospecting/providers/googlePlacesProvider.ts

import axios from 'axios';
import { BusinessProspectingProvider } from './businessProspectingProvider';
import { BusinessSearchRequest, BusinessSearchResult, ProspectingProviderStatus, FoundBusiness } from '../../../types/prospecting.types';

export class GooglePlacesProvider implements BusinessProspectingProvider {
  readonly name = 'GOOGLE_PLACES';
  private readonly apiKey: string;
  private readonly enabled: boolean;
  private readonly language: string;
  private readonly region: string;
  private readonly maxResults: number;
  private readonly timeoutMs: number;

  constructor() {
    this.apiKey = process.env.GOOGLE_PLACES_API_KEY || '';
    this.enabled = process.env.GOOGLE_PLACES_ENABLED === 'true';
    this.language = process.env.GOOGLE_PLACES_LANGUAGE || 'pt-BR';
    this.region = process.env.GOOGLE_PLACES_REGION || 'BR';
    const configuredMaxResults = Number.parseInt(process.env.GOOGLE_PLACES_MAX_RESULTS || '50', 10);
    const configuredTimeoutMs = Number.parseInt(process.env.GOOGLE_PLACES_TIMEOUT_MS || '15000', 10);
    this.maxResults = Number.isFinite(configuredMaxResults) && configuredMaxResults > 0
      ? Math.min(configuredMaxResults, 60)
      : 50;
    this.timeoutMs = Number.isFinite(configuredTimeoutMs) && configuredTimeoutMs > 0
      ? configuredTimeoutMs
      : 15000;
  }

  getStatus(): ProspectingProviderStatus {
    if (!this.enabled) return 'NOT_CONFIGURED';
    if (!this.apiKey) return 'NOT_CONFIGURED';
    return 'CONFIGURED';
  }

  async searchBusinesses(request: BusinessSearchRequest): Promise<BusinessSearchResult> {
    const status = this.getStatus();
    if (status === 'NOT_CONFIGURED') {
      throw new Error('PROSPECTING_NOT_CONFIGURED: Configure GOOGLE_PLACES_API_KEY e GOOGLE_PLACES_ENABLED=true para realizar pesquisas reais.');
    }

    const query = this.buildQuery(request);
    const baseUrl = 'https://maps.googleapis.com/maps/api/place/textsearch/json';
    
    const businesses: FoundBusiness[] = [];
    const seenPlaceIds = new Set<string>();
    const requestedMaxResults = Math.min(
      request.maxResults && request.maxResults > 0 ? request.maxResults : this.maxResults,
      60,
    );
    let pageToken: string | undefined;

    try {
      do {
        const params: any = {
          query,
          key: this.apiKey,
          language: this.language,
          region: this.region,
        };
        if (pageToken) params.pagetoken = pageToken;

        let data: any;
        let tokenAttempts = 0;

        // Google pode devolver INVALID_REQUEST enquanto o next_page_token
        // ainda está sendo ativado. Repetimos algumas vezes antes de falhar.
        while (true) {
          const response = await axios.get(baseUrl, {
            params,
            timeout: this.timeoutMs,
          });

          data = response.data;

          if (data.status === 'INVALID_REQUEST' && pageToken && tokenAttempts < 3) {
            tokenAttempts++;
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue;
          }

          break;
        }

        if (data.status === 'OVER_QUERY_LIMIT' || data.status === 'REQUEST_DENIED') {
          throw new Error(`GOOGLE_PLACES_ERROR: ${data.status} - ${data.error_message || ''}`);
        }

        if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
          throw new Error(`GOOGLE_PLACES_ERROR: ${data.status} - ${data.error_message || ''}`);
        }

        if (Array.isArray(data.results)) {
          for (const place of data.results) {
            if (businesses.length >= requestedMaxResults) break;

            const placeId = String(place.place_id || '').trim();
            if (placeId && seenPlaceIds.has(placeId)) continue;

            if (placeId) seenPlaceIds.add(placeId);
            businesses.push(this.mapPlaceToBusiness(place, request));
          }
        }

        pageToken = data.next_page_token;

        if (pageToken && businesses.length < requestedMaxResults) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } while (pageToken && businesses.length < requestedMaxResults);

      return {
        provider: this.name,
        totalFound: businesses.length,
        businesses,
      };
    } catch (error: any) {
      if (error.response?.status === 403) {
        throw new Error('GOOGLE_PLACES_API_KEY_INVALID: Verifique a credencial configurada.');
      }
      throw error;
    }
  }

  private buildQuery(request: BusinessSearchRequest): string {
    const parts: string[] = [];
    if (request.niche) parts.push(request.niche);
    if (request.subniche) parts.push(request.subniche);
    if (request.city) parts.push(request.city);
    if (request.state) parts.push(request.state);
    if (request.region && !request.city) parts.push(request.region);
    return parts.join(' ');
  }

  private mapPlaceToBusiness(place: any, request: BusinessSearchRequest): FoundBusiness {
    const addressComponents = place.address_components || [];
    const getComponent = (type: string) => 
      addressComponents.find((c: any) => c.types?.includes(type))?.long_name;

    return {
      providerPlaceId: place.place_id,
      name: place.name,
      category: request.niche,
      subcategory: request.subniche,
      address: place.formatted_address,
      city: getComponent('locality') || request.city,
      state: getComponent('administrative_area_level_1') || request.state,
      postalCode: getComponent('postal_code'),
      phone: place.formatted_phone_number,
      website: place.website,
      rating: place.rating,
      reviewCount: place.user_ratings_total,
      photoCount: place.photos?.length || 0,
      googleMapsUrl: place.url,
      businessHours: place.opening_hours?.weekday_text?.join(', '),
      description: place.editorial_summary,
    };
  }

  async getBusinessDetails(placeId: string): Promise<any> {
    const status = this.getStatus();
    if (status !== 'CONFIGURED') return null;

    const baseUrl = 'https://maps.googleapis.com/maps/api/place/details/json';
    try {
      const response = await axios.get(baseUrl, {
        params: { place_id: placeId, key: this.apiKey, language: this.language, fields: 'place_id,name,formatted_address,address_component,formatted_phone_number,international_phone_number,website,rating,user_ratings_total,types,opening_hours,url,photos,business_status' },
        timeout: this.timeoutMs,
      });

      const data = response.data;
      if (data.status !== 'OK' || !data.result) return null;

      const r = data.result;
      const ac = r.address_components || [];
      const getComp = (type: string) => ac.find((c: any) => c.types?.includes(type))?.long_name;

      return {
        placeId: r.place_id,
        name: r.name,
        formattedAddress: r.formatted_address,
        city: getComp('locality'),
        state: getComp('administrative_area_level_1'),
        postalCode: getComp('postal_code'),
        country: getComp('country'),
        phone: r.formatted_phone_number,
        internationalPhone: r.international_phone_number,
        website: r.website,
        rating: r.rating,
        reviewCount: r.user_ratings_total,
        types: r.types || [],
        businessHours: r.opening_hours?.weekday_text?.join(', '),
        googleMapsUrl: r.url,
        businessStatus: r.business_status,
        photoReferences: (r.photos || []).slice(0, 5).map((p: any) => p.photo_reference),
      };
    } catch (error: any) {
      console.error('[GooglePlaces] getBusinessDetails failed for ' + placeId + ': ' + error.message);
      return null;
    }
  }
}

export const googlePlacesProvider = new GooglePlacesProvider();

