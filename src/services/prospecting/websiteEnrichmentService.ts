// src/services/prospecting/websiteEnrichmentService.ts

import { prisma } from '../../modules/mercadoLivre/lib/prisma';
import { businessProspectingManager } from './providers/businessProspectingManager';

export class WebsiteEnrichmentService {
  
  async enrichProspect(prospectId: string): Promise<any> {
    const prospect = await prisma.websiteProspect.findUnique({
      where: { id: prospectId },
    });

    if (!prospect) {
      throw new Error('PROSPECT_NOT_FOUND');
    }

    const enrichment: any = {
      prospectId,
      enrichedAt: new Date().toISOString(),
      data: {},
      sources: [],
    };

    // Reconsulta o provider quando existe um Place ID. Assim o botao
    // "Enriquecer" realmente atualiza os dados atuais, em vez de apenas
    // copiar novamente o que ja estava salvo no prospect.
    if (prospect.providerPlaceId) {
      try {
        const freshDetails = await businessProspectingManager.getBusinessDetails(
          prospect.providerPlaceId
        );

        if (freshDetails) {
          await prisma.websiteProspect.update({
            where: { id: prospectId },
            data: {
              companyName: freshDetails.name || prospect.companyName,
              businessName: freshDetails.name || prospect.businessName,
              address: freshDetails.formattedAddress || prospect.address,
              city: freshDetails.city || prospect.city,
              state: freshDetails.state || prospect.state,
              postalCode: freshDetails.postalCode || prospect.postalCode,
              phone: freshDetails.phone || prospect.phone,
              currentWebsite: freshDetails.website || prospect.currentWebsite,
              googleMapsUrl: freshDetails.googleMapsUrl || prospect.googleMapsUrl,
              rating: freshDetails.rating ?? prospect.rating,
              reviewCount: freshDetails.reviewCount ?? prospect.reviewCount,
              businessHours: freshDetails.businessHours || prospect.businessHours,
              description: freshDetails.description || prospect.description,
              lastEnrichedAt: new Date(),
            },
          });

          Object.assign(enrichment.data, freshDetails);
          enrichment.sources.push('GOOGLE_PLACES_REFRESH');
        }
      } catch (error: any) {
        console.error('[Enrichment] Provider refresh failed:', error.message);
      }
    }

    if (prospect.providerPlaceId) {
      enrichment.data.providerPlaceId = prospect.providerPlaceId;
      enrichment.sources.push('GOOGLE_PLACES');
    }

    if (prospect.currentWebsite) {
      enrichment.data.website = prospect.currentWebsite;
      enrichment.sources.push('WEBSITE');
    }

    if (prospect.phone) {
      enrichment.data.phone = prospect.phone;
      enrichment.data.whatsapp = this.formatWhatsApp(prospect.phone);
      enrichment.sources.push('PHONE');
    }

    if (prospect.googleMapsUrl) {
      enrichment.data.googleMapsUrl = prospect.googleMapsUrl;
      enrichment.sources.push('GOOGLE_MAPS');
    }

    if (prospect.rating && prospect.rating > 0) {
      enrichment.data.rating = prospect.rating;
      enrichment.data.reviewCount = prospect.reviewCount || 0;
      enrichment.sources.push('GOOGLE_REVIEWS');
    }

    if (prospect.businessHours) {
      enrichment.data.businessHours = prospect.businessHours;
    }

    if (prospect.description) {
      enrichment.data.description = prospect.description;
    }

    await prisma.websiteProspect.update({
      where: { id: prospectId },
      data: {
        lastEnrichedAt: new Date(),
        prospectingMetadata: JSON.stringify(enrichment.data),
      },
    });

    await this.logEvent(prospectId, 'PROSPECT_ENRICHED', 
      `Dados enriquecidos de ${enrichment.sources.length} fontes`);

    return enrichment;
  }

  private formatWhatsApp(phone?: string): string | null {
    if (!phone) return null;
    const digits = phone.replace(/\D/g, '');
    if (digits.length >= 12 && digits.startsWith('55')) {
      return `+${digits}`;
    }
    if (digits.length >= 10) {
      return `+55${digits}`;
    }
    return phone;
  }

  private async logEvent(prospectId: string, type: string, description: string) {
    try {
      await prisma.websiteProspectEvent.create({
        data: {
          prospectId,
          type,
          description,
        },
      });
    } catch (error) {
      console.error('[Enrichment] Failed to log event:', error);
    }
  }
}

export const websiteEnrichmentService = new WebsiteEnrichmentService();