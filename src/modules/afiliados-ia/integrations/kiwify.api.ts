import axios from 'axios';

export class KiwifyAPI {
  private baseURL = 'https://api.kiwify.com.br/v1';
  // Usamos apenas o token de acesso direto gerado no painel
  private token = process.env.KIWIFY_ACCESS_TOKEN || '';

  getAccessToken(): string {
    return this.token;
  }

  async buscarProdutosAfiliados() {
    if (!this.token) {
      console.log('[Kiwify] KIWIFY_ACCESS_TOKEN nao configurado no .env. Pulando busca.');
      return [];
    }

    try {
      console.log('[Kiwify] Buscando produtos com Token de Acesso...');
      
      const response = await axios.get(this.baseURL + '/affiliates/products', {
        headers: {
          'Authorization': 'Bearer ' + this.token,
          'Content-Type': 'application/json'
        },
        params: {
          status: 'active',
          limit: 50 // Aumentamos o limite para trazer mais opÃ§Ãµes
        }
      });

      const produtos = [];
      const data = response.data.data || response.data;

      for (const item of data) {
        const comissaoPercentual = item.commission_percentage || 0;
        const preco = item.price || 0;

        // Filtro inteligente: Comissao >= 30% e Preco >= 20 (mais flexivel para testar)
        if (comissaoPercentual >= 30 && preco >= 20) {
          let categoria = 'outros';
          const nomeLower = (item.name || '').toLowerCase();
          
          if (nomeLower.includes('emagrec') || nomeLower.includes('saude') || nomeLower.includes('capsula') || nomeLower.includes('pele')) {
            categoria = 'saude';
          } else if (nomeLower.includes('renda') || nomeLower.includes('marketing') || nomeLower.includes('curso') || nomeLower.includes('trafego')) {
            categoria = 'tecnologia';
          } else if (nomeLower.includes('relacionamento') || nomeLower.includes('casal')) {
            categoria = 'relacionamento';
          }

          produtos.push({
            plataforma: 'kiwify',
            produtoIdExterno: item.id ? String(item.id) : 'kiwify_' + Date.now(),
            nome: item.name || 'Produto Kiwify',
            categoria: categoria,
            tipo: 'digital',
            preco: preco,
            comissaoPercentual: comissaoPercentual,
            linkAfiliado: item.affiliate_link || '',
            thumbnail: item.image_url || '',
            temperatura: item.temperature || 50,
            score: this.calcularScore(preco, comissaoPercentual, item.temperature || 50),
            status: 'ativo'
          });
        }
      }
      
      console.log('[Kiwify] ' + produtos.length + ' produtos aprovados e salvos!');
      return produtos;

    } catch (error: any) {
      console.error('[Kiwify] Erro na API:', error.response?.data || error.message);
      return [];
    }
  }

  private calcularScore(preco: number, comissao: number, temperatura: number): number {
    const ticketIdeal = preco >= 47 && preco <= 197 ? 10 : 5;
    return (comissao * 0.5) + ((temperatura / 10) * 0.3) + (ticketIdeal * 0.2);
  }
}
