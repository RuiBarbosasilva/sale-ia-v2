import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { HunterService } from './services/hunter.service';
import { CopywriterService } from './services/copywriter.service';
import { CriativoService } from './services/criativo.service';
import { VendedorVirtualService } from './services/vendedor.service';
import { TelegramAPI } from './integrations/telegram.api';
import { HotmartWebhookService } from './services/hotmart-webhook.service';
import { KiwifyAPI } from './integrations/kiwify.api';

const prisma = new PrismaClient();
const hunterService = new HunterService();
const copywriterService = new CopywriterService();
const criativoService = new CriativoService();
const vendedorService = new VendedorVirtualService();
const telegramAPI = new TelegramAPI();
const hotmartWebhookService = new HotmartWebhookService();
const kiwifyAPI = new KiwifyAPI();

export const executarHunter = async (req: Request, res: Response) => {
  try {
    const { nichos } = req.body;
    const produtos = await hunterService.executarBusca(nichos || ['saude', 'tecnologia']);
    return res.json({ sucesso: true, total: produtos.length, produtos });
  } catch (error: any) {
    return res.status(500).json({ sucesso: false, erro: error.message });
  }
};

export const listarProdutos = async (req: Request, res: Response) => {
  try {
    const produtos = await prisma.afiliadoProduto.findMany({ orderBy: { score: 'desc' }, take: 20 });
    return res.json({ sucesso: true, total: produtos.length, produtos });
  } catch (error: any) {
    return res.status(500).json({ sucesso: false, erro: error.message });
  }
};

export const gerarCopies = async (req: Request, res: Response) => {
  try {
    const { produtoId, quantidade } = req.body;
    const copies = await copywriterService.gerarCopies(produtoId, quantidade || 3);
    return res.json({ sucesso: true, total: copies.length, copies });
  } catch (error: any) {
    return res.status(500).json({ sucesso: false, erro: error.message });
  }
};

export const gerarCriativo = async (req: Request, res: Response) => {
  try {
    const { produtoId, copyId } = req.body;
    const resultado = await criativoService.gerarCriativo(produtoId, copyId);
    return res.json({ sucesso: true, dados: resultado });
  } catch (error: any) {
    return res.status(500).json({ sucesso: false, erro: error.message });
  }
};

export const gerarFluxoVendedor = async (req: Request, res: Response) => {
  try {
    const { produtoId } = req.body;
    const fluxo = await vendedorService.gerarFluxoVendas(produtoId);
    return res.json({ sucesso: true, dados: fluxo });
  } catch (error: any) {
    return res.status(500).json({ sucesso: false, erro: error.message });
  }
};

export const divulgarNoTelegram = async (req: Request, res: Response) => {
  try {
    const { produtoId, variacaoCopy } = req.body;
    const produto = await prisma.afiliadoProduto.findUnique({ where: { id: produtoId } });
    if (!produto) return res.status(404).json({ sucesso: false, erro: 'Produto nao encontrado' });

    const copies = await prisma.afiliadoCopy.findMany({ where: { produtoId } });
    if (copies.length === 0) return res.status(400).json({ sucesso: false, erro: 'Gere copies para este produto primeiro' });

    const copyEscolhida = copies.find((c: any) => c.variacao === (variacaoCopy || 1)) || copies[0];
    const link = produto.linkAfiliado || 'Link na Bio do Perfil';
    const mensagem = copyEscolhida.conteudo + '\n\nðŸ”— *Garanta o seu aqui:* ' + link;

    const messageId = await telegramAPI.enviarMensagem(mensagem);
    await prisma.afiliadoPublicacao.create({
      data: { produtoId, canal: 'telegram', dataPublicacao: new Date(), status: 'publicado' }
    });

    return res.json({ sucesso: true, mensagem: 'Divulgado no Telegram com sucesso!', messageId });
  } catch (error: any) {
    return res.status(500).json({ sucesso: false, erro: error.message });
  }
};

export const receberWebhookHotmart = async (req: Request, res: Response) => {
  try {
    console.log('[Webhook Hotmart] RequisiÃ§Ã£o recebida');
    const resultado = await hotmartWebhookService.processarEvento(req.body);
    return res.json(resultado);
  } catch (error: any) {
    console.error('[Webhook Hotmart] Erro:', error);
    return res.status(500).json({ sucesso: false, erro: error.message });
  }
};

export const relatorioOportunidades = async (req: Request, res: Response) => {
  try {
    const oportunidades = await prisma.afiliadoProduto.findMany({
      where: { score: { gte: 5.0 }, OR: [{ linkAfiliado: '' }, { linkAfiliado: null }] },
      orderBy: { score: 'desc' },
      take: 10
    });
    const relatorio = oportunidades.map(p => ({
      nome: p.nome, plataforma: p.plataforma, categoria: p.categoria, preco: p.preco, comissaoPercentual: p.comissaoPercentual, score: p.score,
      acaoRecomendada: 'Acesse o painel da ' + p.plataforma + ', busque por "' + p.nome + '" e gere seu link de afiliado.'
    }));
    return res.json({ sucesso: true, total: relatorio.length, mensagem: 'Produtos com alto potencial sem link de afiliado.', oportunidades: relatorio });
  } catch (error: any) {
    return res.status(500).json({ sucesso: false, erro: error.message });
  }
};

export const obterDashboard = async (req: Request, res: Response) => {
  try {
    const totalProdutos = await prisma.afiliadoProduto.count({ where: { status: 'ativo' } });
    const totalCopies = await prisma.afiliadoCopy.count();
    const publicacoes = await prisma.afiliadoPublicacao.findMany();
    const totalCliques = publicacoes.reduce((sum: any, p: any) => sum + (p.cliques || 0), 0);
    const totalVendas = publicacoes.reduce((sum: any, p: any) => sum + (p.vendasConfirmadas || 0), 0);
    const comissaoTotal = publicacoes.reduce((sum: any, p: any) => sum + (p.comissaoGerada || 0), 0);
    const topProdutos = await prisma.afiliadoProduto.findMany({ orderBy: { score: 'desc' }, take: 10 });

    return res.json({
      sucesso: true,
      dados: { totalProdutos, totalCopies, totalPublicacoes: publicacoes.length, totalCliques, totalVendas, comissaoTotal, taxaConversao: totalCliques > 0 ? (totalVendas / totalCliques) * 100 : 0, topProdutos }
    });
  } catch (error: any) {
    return res.status(500).json({ sucesso: false, erro: error.message });
  }
};

// NOVO: Endpoint de Debug da Kiwify
export const debugKiwify = async (req: Request, res: Response) => {
  try {
    const token = await kiwifyAPI.getAccessToken();
    const produtos = await kiwifyAPI.buscarProdutosAfiliados();
    
    return res.json({
      sucesso: true,
      config: {
        clientId: process.env.KIWIFY_CLIENT_ID ? 'Configurado (' + process.env.KIWIFY_CLIENT_ID.substring(0,4) + '...)' : 'NÃƒO CONFIGURADO',
        clientSecret: process.env.KIWIFY_CLIENT_SECRET ? 'Configurado' : 'NÃƒO CONFIGURADO',
        accountId: process.env.KIWIFY_ACCOUNT_ID ? 'Configurado' : 'NÃƒO CONFIGURADO'
      },
      tokenStatus: token ? 'Gerado com sucesso!' : 'Falha ao gerar token',
      produtosEncontrados: produtos.length,
      amostraProdutos: produtos.slice(0, 3)
    });
  } catch (error: any) {
    return res.status(500).json({ sucesso: false, erro: error.message });
  }
};
