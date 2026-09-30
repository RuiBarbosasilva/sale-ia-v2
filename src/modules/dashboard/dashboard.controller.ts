import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

export const obterMetricasCompletas = async (req: Request, res: Response) => {
  try {
    // AFILIADOS-IA
    const totalProdutos = await prisma.afiliadoProduto.count();
    const produtosAtivos = await prisma.afiliadoProduto.count({ where: { status: 'ativo' } });
    const totalCopies = await prisma.afiliadoCopy.count();
    const totalPublicacoes = await prisma.afiliadoPublicacao.count();
    const publicacoes = await prisma.afiliadoPublicacao.findMany();
    const totalVendas = publicacoes.reduce((sum: number, p: any) => sum + (p.vendasConfirmadas || 0), 0);
    const comissaoTotal = publicacoes.reduce((sum: number, p: any) => sum + (p.comissaoGerada || 0), 0);
    const totalCliques = publicacoes.reduce((sum: number, p: any) => sum + (p.cliques || 0), 0);

    // Agrupar produtos por plataforma
    const produtosPorPlataforma = await prisma.afiliadoProduto.groupBy({
      by: ['plataforma'],
      _count: { plataforma: true }
    });

    // Top 10 produtos por score
    const topProdutos = await prisma.afiliadoProduto.findMany({
      orderBy: { score: 'desc' },
      take: 10,
      select: { nome: true, plataforma: true, categoria: true, preco: true, comissaoPercentual: true, score: true, linkAfiliado: true }
    });

    // Copies por categoria
    const copiesPorCategoria = await prisma.afiliadoProduto.groupBy({
      by: ['categoria'],
      _count: { categoria: true }
    });

    // FACTORY EBOOK
    let livrosGerados = 0;
    let paginasTotais = 0;
    const nichosLivros: any = {};
    const outputDir = path.resolve(process.cwd(), 'output', 'factory-ebook');
    if (fs.existsSync(outputDir)) {
      const arquivos = fs.readdirSync(outputDir).filter(f => f.endsWith('_metadata.json'));
      livrosGerados = arquivos.length;
      for (const f of arquivos) {
        try {
          const meta = JSON.parse(fs.readFileSync(path.join(outputDir, f), 'utf-8'));
          paginasTotais += meta.paginas || 0;
          nichosLivros[meta.tema] = (nichosLivros[meta.tema] || 0) + 1;
        } catch (e) {}
      }
    }

    // ESPECIALISTA - Plataformas
    const plataformasRanking = [
      { nome: 'Clickbank', potencial: 10, comissao: '50-75%', moeda: 'USD' },
      { nome: 'Ticto', potencial: 10, comissao: '50-80%', moeda: 'BRL' },
      { nome: 'Hotmart', potencial: 9, comissao: '30-80%', moeda: 'BRL' },
      { nome: 'Kiwify', potencial: 9, comissao: '40-80%', moeda: 'BRL' },
      { nome: 'Impact', potencial: 9, comissao: '5-25%', moeda: 'USD' },
      { nome: 'Braip', potencial: 8, comissao: '40-70%', moeda: 'BRL' },
      { nome: 'Eduzz', potencial: 8, comissao: '40-80%', moeda: 'BRL' },
      { nome: 'JVZoo', potencial: 8, comissao: '50-75%', moeda: 'USD' },
      { nome: 'CJ Affiliate', potencial: 8, comissao: '3-15%', moeda: 'USD' },
      { nome: 'Awin', potencial: 8, comissao: '3-15%', moeda: 'USD' },
      { nome: 'Monetizze', potencial: 7, comissao: '40-70%', moeda: 'BRL' },
      { nome: 'WarriorPlus', potencial: 7, comissao: '50-100%', moeda: 'USD' },
      { nome: 'ShareASale', potencial: 7, comissao: '5-20%', moeda: 'USD' },
      { nome: 'Amazon', potencial: 6, comissao: '4-15%', moeda: 'BRL/USD' },
      { nome: 'Lomadee', potencial: 6, comissao: '2-15%', moeda: 'BRL' },
      { nome: 'Shopee', potencial: 5, comissao: '3-15%', moeda: 'BRL' }
    ];

    return res.json({
      sucesso: true,
      dados: {
        afiliados: {
          totalProdutos, produtosAtivos, totalCopies, totalPublicacoes,
          totalVendas, comissaoTotal: comissaoTotal.toFixed(2),
          totalCliques,
          taxaConversao: totalCliques > 0 ? ((totalVendas / totalCliques) * 100).toFixed(2) : '0.00',
          produtosPorPlataforma: produtosPorPlataforma.map((p: any) => ({ plataforma: p.plataforma, quantidade: p._count.plataforma })),
          topProdutos,
          copiesPorCategoria: copiesPorCategoria.map((c: any) => ({ categoria: c.categoria, quantidade: c._count.categoria }))
        },
        factoryEbook: {
          livrosGerados, paginasTotais, nichosLivros
        },
        especialista: {
          totalPlataformas: plataformasRanking.length,
          ranking: plataformasRanking
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('[Dashboard] Erro:', error);
    return res.status(500).json({ sucesso: false, erro: error.message });
  }
};

export const servirDashboardHTML = async (req: Request, res: Response) => {
  const htmlPath = path.resolve(__dirname, 'views', 'dashboard.html');
  if (fs.existsSync(htmlPath)) {
    return res.sendFile(htmlPath);
  }
  return res.status(404).send('Dashboard HTML nao encontrado');
};
