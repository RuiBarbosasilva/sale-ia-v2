import { prisma } from '../../mercadoLivre/lib/prisma';
import { KiwifyAPI } from '../integrations/kiwify.api';
import { BraipAPI } from '../integrations/braip.api';
import { ClickbankAPI } from '../integrations/clickbank.api';
const kiwifyAPI = new KiwifyAPI();
const braipAPI = new BraipAPI();
const clickbankAPI = new ClickbankAPI();

export class HunterService {
  async executarBusca(nichos: string[]) {
    console.log('[Hunter Analista] Iniciando varredura de mercado por produtos campeoes...');
    const todosProdutos = [];

    // 1. Produtos Locais (ML)
    const produtosML = await prisma.product.findMany({
      where: { active: true, salePrice: { gte: 80, lte: 500 } },
      take: 30, orderBy: { salePrice: 'desc' }
    });
    for (const produto of produtosML) {
      if ((produto.stock || 0) > 0) {
        let categoria = 'outros';
        const nome = (produto.name || '').toLowerCase();
        if (nome.includes('brinde') || nome.includes('kit') || nome.includes('presente') || nome.includes('executivo')) categoria = 'corporativo';
        else if (nome.includes('casa') || nome.includes('decoracao')) categoria = 'casa';
        else if (nome.includes('tech') || nome.includes('fone') || nome.includes('smartwatch')) categoria = 'tecnologia';
        else if (nome.includes('saude') || nome.includes('vitamina')) categoria = 'saude';

        todosProdutos.push({
          plataforma: 'mercadolivre', produtoIdExterno: produto.id, nome: produto.name || 'Produto ML',
          categoria, tipo: 'fisico', preco: produto.salePrice || 0, comissaoPercentual: 8,
          linkAfiliado: '', thumbnail: '', score: 5.0, status: 'ativo',
          motivoCampeao: 'Produto fisico com estoque disponivel e bom ticket medio.'
        });
      }
    }

    // 2. Buscar nas Plataformas de Afiliados (Kiwify, Braip, Clickbank)
    todosProdutos.push(...(await kiwifyAPI.buscarProdutosAfiliados()));
    todosProdutos.push(...(await braipAPI.buscarProdutosCampeoes()));
    todosProdutos.push(...(await clickbankAPI.buscarProdutosCampeoesInternacionais()));

    // 3. Salvar com inteligencia (evita duplicatas e atualiza se for melhor)
    const produtosSalvos = [];
    for (const prod of todosProdutos) {
      const jaExiste = await prisma.afiliadoProduto.findFirst({
        where: { produtoIdExterno: prod.produtoIdExterno, plataforma: prod.plataforma }
      });
      
      if (!jaExiste) {
        const salvo = await prisma.afiliadoProduto.create({
          data: {
            plataforma: prod.plataforma, produtoIdExterno: prod.produtoIdExterno, nome: prod.nome,
            categoria: prod.categoria, tipo: prod.tipo, preco: prod.preco,
            comissaoPercentual: prod.comissaoPercentual, linkAfiliado: prod.linkAfiliado,
            thumbnail: prod.thumbnail, temperatura: prod.temperatura, score: prod.score,
            status: prod.status
          }
        });
        produtosSalvos.push(salvo);
      }
    }

    console.log('[Hunter Analista] ' + produtosSalvos.length + ' produtos campeoes processados e salvos!');
    return produtosSalvos;
  }
}
