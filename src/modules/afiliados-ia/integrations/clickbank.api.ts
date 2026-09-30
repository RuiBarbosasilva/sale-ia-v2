import axios from 'axios';

export class ClickbankAPI {
  private developerKey = process.env.CLICKBANK_DEV_KEY || '';
  private affiliateKey = process.env.CLICKBANK_AFFILIATE_KEY || '';

  async buscarProdutosCampeoesInternacionais() {
    if (!this.developerKey || !this.affiliateKey) {
      console.log('[Clickbank] Chaves nao configuradas no .env. Pulando busca.');
      return [];
    }

    try {
      console.log('[Clickbank] Buscando produtos campeoes internacionais (Health & Fitness)...');
      // API publica do Clickbank Marketplace
      const response = await axios.get('https://api.clickbank.com/rest/1.3/marketplace/search', {
        headers: {
          'Authorization': 'Basic ' + Buffer.from(this.developerKey + ':' + this.affiliateKey).toString('base64'),
          'Accept': 'application/json'
        },
        params: {
          category: 'Health & Fitness',
          maxResults: 20,
          sortBy: 'popularity'
        }
      });

      const produtos = [];
      const data = response.data || [];

      for (const item of data) {
        const comissaoPercentual = item.commissionPercentage || 0;
        const preco = item.averageEarningsPerSale || 0; // Estimativa em USD

        if (comissaoPercentual >= 50 && preco >= 20) {
          produtos.push({
            plataforma: 'clickbank',
            produtoIdExterno: item.vendor || 'cb_' + Date.now(),
            nome: item.vendor + ' - ' + (item.category || 'Health'),
            categoria: 'saude',
            tipo: 'digital',
            preco: preco * 5.5, // Conversao aproximada USD -> BRL para score
            comissaoPercentual: comissaoPercentual,
            linkAfiliado: 'https://' + (this.affiliateKey || 'SEU_APE') + '.' + (item.vendor || 'vendor') + '.hop.clickbank.net',
            thumbnail: '',
            temperatura: item.popularityRank || 50,
            score: this.calcularScore(preco, comissaoPercentual, item.popularityRank || 50),
            status: 'ativo',
            motivoCampeao: 'Produto internacional com ' + comissaoPercentual + '% de comissao em USD.'
          });
        }
      }
      console.log('[Clickbank] ' + produtos.length + ' produtos internacionais encontrados!');
      return produtos;
    } catch (error: any) {
      console.error('[Clickbank] Erro na API:', error.response?.data || error.message);
      return [];
    }
  }

  private calcularScore(precoUsd: number, comissao: number, popularidade: number): number {
    // Quanto menor o rank de popularidade no Clickbank, melhor (1 e o melhor)
    const popularidadeScore = Math.max(0, 10 - (popularidade / 10));
    return (comissao * 0.5) + (popularidadeScore * 0.3) + 2;
  }
}
