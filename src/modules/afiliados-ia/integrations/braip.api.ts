import axios from 'axios';

export class BraipAPI {
  private baseURL = 'https://api.braip.com/v1';
  private token = process.env.BRAIP_API_TOKEN || '';

  async buscarProdutosCampeoes() {
    if (!this.token) {
      console.log('[Braip] Token nao configurado no .env. Pulando busca.');
      return [];
    }

    try {
      console.log('[Braip] Buscando produtos campeoes de vendas...');
      // Endpoint simulado baseado na estrutura padrao de afiliados da Braip
      const response = await axios.get(this.baseURL + '/afiliados/produtos', {
        headers: {
          'Authorization': 'Bearer ' + this.token,
          'Content-Type': 'application/json'
        },
        params: {
          status: 'active',
          order_by: 'sales_desc', // Foco nos mais vendidos
          limit: 20
        }
      });

      const produtos = [];
      const data = response.data.data || response.data;

      for (const item of data) {
        const comissaoPercentual = item.commission_percentage || 0;
        const preco = item.price || 0;
        const vendas = item.sales_count || 0;

        // Filtro de Campeao: Comissao > 40%, Preço entre 97 e 297, Vendas > 50
        if (comissaoPercentual >= 40 && preco >= 97 && preco <= 297 && vendas >= 50) {
          let categoria = 'saude'; // Braip e forte em saude/beleza
          const nomeLower = (item.name || '').toLowerCase();
          if (nomeLower.includes('emagrec') || nomeLower.includes('pele') || nomeLower.includes('capsula')) {
            categoria = 'saude';
          } else if (nomeLower.includes('renda') || nomeLower.includes('marketing')) {
            categoria = 'tecnologia';
          }

          produtos.push({
            plataforma: 'braip',
            produtoIdExterno: item.id ? String(item.id) : 'braip_' + Date.now(),
            nome: item.name || 'Produto Braip',
            categoria: categoria,
            tipo: 'encapsulado',
            preco: preco,
            comissaoPercentual: comissaoPercentual,
            linkAfiliado: item.affiliate_link || '',
            thumbnail: item.image_url || '',
            temperatura: item.temperature || 80,
            score: this.calcularScore(preco, comissaoPercentual, vendas),
            status: 'ativo',
            motivoCampeao: 'Alta conversao em encapsulados com ' + comissaoPercentual + '% de comissao e ' + vendas + ' vendas.'
          });
        }
      }
      console.log('[Braip] ' + produtos.length + ' produtos campeoes encontrados!');
      return produtos;
    } catch (error: any) {
      console.error('[Braip] Erro na API:', error.response?.data || error.message);
      return [];
    }
  }

  private calcularScore(preco: number, comissao: number, vendas: number): number {
    // Score ponderado: Vendas (40%), Comissao (40%), Ticket Ideal (20%)
    const ticketIdeal = preco >= 147 && preco <= 197 ? 10 : 5;
    const vendasScore = Math.min(vendas / 10, 10);
    return (vendasScore * 0.4) + (comissao * 0.4) + (ticketIdeal * 0.2);
  }
}
