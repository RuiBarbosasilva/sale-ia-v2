import axios from 'axios';
import { prisma } from '../../modules/mercadoLivre/lib/prisma';

export class MlAffiliateHunterService {
  private trackingId = process.env.ML_AFFILIATE_TRACKING_ID || 'rb20260926202806204';

  private readonly categories: Record<string, string> = {
    CASA: 'MLB131938',
    ELETRONICOS: 'MLB1055'
  };

  async syncAllCategories(limit: number = 5) {
    const results: Record<string, any> = {};

    for (const categoryKey of Object.keys(this.categories)) {
      results[categoryKey] = await this.fetchAndSaveTopProducts(categoryKey, limit);
    }

    return results;
  }

  async fetchAndSaveTopProducts(categoryKey: string, limit: number = 5) {
    try {
      console.log('[ML Hunter] Iniciando busca para:', categoryKey);
      const categoryId = this.categories[categoryKey.toUpperCase()];
      const url = 'https://api.mercadolibre.com/sites/MLB/search?category=' + categoryId + '&sort=sales_desc&limit=' + limit;
      
      // HEADERS COMPLETOS DE UM NAVEGADOR CHROME REAL NO WINDOWS
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer': 'https://www.mercadolivre.com.br/',
        'Sec-Ch-Ua': '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1'
      };

      console.log('[ML Hunter] Chamando API com headers de navegador...');
      const response = await axios.get(url, { headers });
      
      if (!response.data || !response.data.results) {
        throw new Error('API do ML retornou dados invÃ¡lidos.');
      }

      const products = response.data.results;
      console.log('[ML Hunter] Sucesso! API retornou', products.length, 'produtos.');
      
      let savedCount = 0;

      for (const item of products) {
        const affiliateLink = item.permalink + '?matt_tool=' + this.trackingId;

        const exists = await prisma.afiliadoProduto.findFirst({
          where: { produtoIdExterno: item.id }
        });

        if (!exists) {
          await prisma.afiliadoProduto.create({
            data: {
              nome: item.title,
              plataforma: 'mercadolivre',
              produtoIdExterno: item.id,
              tipo: 'fisico',
              preco: Number(item.price) || 0,
              comissaoPercentual: 0,
              linkAfiliado: affiliateLink,
              score: 0,
              status: 'ativo'
            }
          });
          savedCount++;
        }
      }

      console.log('[ML Hunter] ' + savedCount + ' novos produtos salvos no banco.');
      return { success: true, savedCount, totalFound: products.length };

    } catch (error: any) {
      console.error('âŒ [ML Hunter] ERRO:', error.message);
      if (error.response) {
        console.error('   Status:', error.response.status);
        console.error('   Dados do erro:', JSON.stringify(error.response.data));
      }
      return { success: false, error: error.message };
    }
  }
}
