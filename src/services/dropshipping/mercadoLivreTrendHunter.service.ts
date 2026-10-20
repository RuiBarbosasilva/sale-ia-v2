import { prisma } from '../../modules/mercadoLivre/lib/prisma';

export interface TrendData {
  keyword: string;
  url: string;
  position?: number;
  source: 'TRENDS_API' | 'SEARCH_API' | 'MANUAL';
}

export class MercadoLivreTrendHunterService {
  private readonly baseUrl = 'https://api.mercadolibre.com';
  private readonly headers = { 
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json'
  };
  
  private readonly defaultKeywords = ['organizador de cabos', 'suporte de celular', 'kit ferramentas', 'acessorio automotivo', 'utilidade domestica'];

  async fetchTrendsFallback(): Promise<TrendData[]> {
    const results: TrendData[] = [];
    
    for (const keyword of this.defaultKeywords) {
      try {
        const response = await fetch(`${this.baseUrl}/sites/MLB/search?q=${encodeURIComponent(keyword)}&limit=3`, {
          headers: this.headers
        });
        
        if (response.ok) {
          const data: any = await response.json();
          if (data.results && Array.isArray(data.results)) {
            data.results.forEach((item: any, idx: number) => {
              results.push({
                keyword: keyword,
                url: item.permalink || item.url,
                position: idx + 1,
                source: 'SEARCH_API'
              });
            });
          }
        } else {
          console.warn(`[TrendHunter] Busca falhou para '${keyword}': ${response.status}`);
        }
      } catch (e: any) {
        console.error(`[TrendHunter] Erro ao buscar '${keyword}': `, e.message);
      }
    }
    
    return results;
  }

  async collectAndSave(): Promise<{ collected: number; saved: number; source: string }> {
    let trends: TrendData[] = [];
    let source = 'TRENDS_API';

    try {
      const res = await fetch(`${this.baseUrl}/trends/MLB`, { headers: this.headers });
      if (res.ok) {
        const data: any = await res.json();
        if (Array.isArray(data)) {
          trends = data.map((item: any, idx: number) => ({
            keyword: item.keyword,
            url: item.url,
            position: idx + 1,
            source: 'TRENDS_API'
          }));
        }
      } else {
        console.log(`[TrendHunter] Trends API retornou ${res.status}. Ativando fallback...`);
      }
    } catch (e: any) {
      console.log(`[TrendHunter] Erro na Trends API (${e.message}). Ativando fallback...`);
    }

    if (trends.length === 0) {
      console.log('[TrendHunter] Executando fallback de busca...');
      trends = await this.fetchTrendsFallback();
      source = 'SEARCH_API (Fallback)';
    }

    let saved = 0;
    for (const t of trends) {
      try {
        await prisma.dropshipTrendSnapshot.create({
          data: {
            keyword: t.keyword,
            position: t.position,
            apiUrl: t.url,
            trend: t.source,
            collectedAt: new Date()
          }
        });
        saved++;
      } catch (e) {
        // Ignora duplicatas ou erros individuais de DB
      }
    }
    
    console.log(`? [TrendHunter] Coletadas ${trends.length} via ${source}, salvas ${saved} no banco.`);
    return { collected: trends.length, saved: saved, source };
  }

  async getLatest(limit: number = 50) {
    return await prisma.dropshipTrendSnapshot.findMany({
      orderBy: { collectedAt: 'desc' },
      take: limit
    });
  }

  async getStats() {
    const [total, last, unique] = await Promise.all([
      prisma.dropshipTrendSnapshot.count(),
      prisma.dropshipTrendSnapshot.findFirst({ orderBy: { collectedAt: 'desc' } }),
      prisma.dropshipTrendSnapshot.groupBy({ by: ['keyword'], _count: true })
    ]);
    return {
      totalSnapshots: total,
      lastCollection: last ? last.collectedAt : null,
      uniqueKeywords: unique.length
    };
  }
}

export const mercadoLivreTrendHunterService = new MercadoLivreTrendHunterService();
