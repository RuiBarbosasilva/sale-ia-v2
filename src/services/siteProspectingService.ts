import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

export interface SearchParams { city: string; state: string; segment: string; quantity?: number; }
export interface BusinessData { name: string; category: string; city: string; state: string; phone?: string; website?: string; rating?: number; reviewCount?: number; source: string; }

export class SiteProspectingService {
  private googleApiKey: string;

  constructor() {
    this.googleApiKey = process.env.GOOGLE_PLACES_API_KEY || '';
  }

  async searchBusinesses(params: SearchParams): Promise<{ businesses: BusinessData[]; total: number }> {
    if (this.googleApiKey) {
      try {
        return await this.searchWithGoogleAPI(params);
      } catch (error: any) {
        console.error('[SiteProspecting] Erro na Google API:', error.message);
        console.warn('[SiteProspecting] Usando modo simulado como fallback');
      }
    } else {
      console.warn('[SiteProspecting] GOOGLE_PLACES_API_KEY não configurada');
    }
    
    return this.simulateSearch(params);
  }

  private async searchWithGoogleAPI(params: SearchParams): Promise<{ businesses: BusinessData[]; total: number }> {
    const qty = params.quantity || 10;
    const location = `${params.city}, ${params.state}, Brazil`;
    const query = `${params.segment} in ${location}`;

    const response = await axios.get('https://maps.googleapis.com/maps/api/place/textsearch/json', {
      params: {
        query,
        key: this.googleApiKey,
        language: 'pt-BR',
        region: 'br',
        type: 'establishment'
      },
      timeout: 15000
    });

    if (response.data.status !== 'OK') {
      throw new Error(`Google API retornou: ${response.data.status}`);
    }

    const businesses: BusinessData[] = response.data.results.slice(0, qty).map((place: any) => ({
      name: place.name,
      category: place.types?.[0] || params.segment,
      city: params.city,
      state: params.state,
      phone: place.formatted_phone_number,
      website: place.website,
      rating: place.rating,
      reviewCount: place.user_ratings_total,
      source: 'GOOGLE_PLACES_API'
    }));

    console.log(`[Google Places] ${businesses.length} empresas reais encontradas`);
    return { businesses, total: businesses.length };
  }

  private async simulateSearch(params: SearchParams): Promise<{ businesses: BusinessData[]; total: number }> {
    const qty = params.quantity || 10;
    const names: Record<string, string[]> = {
      'restaurante': ['Restaurante Sabor & Cia', 'Cantina Italiana'],
      'clinica': ['Clínica Saúde Total', 'Clínica Bem Estar'],
      'advocacia': ['Escritório Silva Advogados', 'Advocacia Associados']
    };
    const list = names[params.segment.toLowerCase()] || names['restaurante'];
    const businesses: BusinessData[] = [];
    
    for (let i = 0; i < qty; i++) {
      businesses.push({
        name: `${list[i % list.length]} ${i + 1}`,
        category: params.segment,
        city: params.city,
        state: params.state,
        phone: `119${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
        website: Math.random() > 0.6 ? `https://empresa-${i}.com.br` : undefined,
        rating: 3.5 + Math.random() * 1.5,
        source: 'SIMULATED'
      });
    }
    
    return { businesses, total: businesses.length };
  }

  async saveProspect(b: BusinessData): Promise<any> {
    const existing = await prisma.websiteProspect.findFirst({ where: { companyName: b.name, city: b.city } });
    if (existing) return existing;
    return prisma.websiteProspect.create({
      data: {
        companyName: b.name, segment: b.category, city: b.city, state: b.state,
        phone: b.phone, email: null, currentWebsite: b.website || null,
        websiteStatus: b.website ? 'UNKNOWN' : 'NO_WEBSITE',
        websiteScore: 0, status: 'DISCOVERED', score: 0, scoreGrade: null
      }
    });
  }

  calculateOpportunityScore(p: any): number {
    let score = 0;
    if (p.websiteStatus === 'NO_WEBSITE') score += 40;
    else if (p.websiteStatus === 'WEBSITE_POOR' || p.websiteScore < 40) score += 30;
    if (p.phone) score += 10;
    if (p.rating && p.rating >= 4.0) score += 10;
    return Math.min(100, score);
  }
}

export const siteProspectingService = new SiteProspectingService();
