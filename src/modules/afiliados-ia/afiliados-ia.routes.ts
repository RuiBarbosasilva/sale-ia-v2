import { Router } from 'express';
import {
  executarHunter,
  listarProdutos,
  cadastrarProduto,
  gerarCopies,
  gerarCriativo,
  gerarFluxoVendedor,
  divulgarNoTelegram,
  receberWebhookHotmart,
  relatorioOportunidades,
  obterDashboard
} from './afiliados-ia.controller';
import { debugCriativo } from './debug-criativo.controller';
import { mercadoLivreAdminGuard } from '../mercadoLivre/middleware/adminGuard';
import { generateTikTokAffiliatePackage } from './services/tiktokAffiliateContent.service';

export const afiliadosIaRoutes = Router();

// Rota de debug
afiliadosIaRoutes.get('/debug/criativo', debugCriativo);

// Rotas principais
afiliadosIaRoutes.post('/hunter/executar', executarHunter);
afiliadosIaRoutes.get('/produtos', listarProdutos);
afiliadosIaRoutes.post('/produtos', cadastrarProduto);
afiliadosIaRoutes.post('/copies/gerar', gerarCopies);
afiliadosIaRoutes.post('/criativo/gerar', gerarCriativo);
afiliadosIaRoutes.post('/vendedor/fluxo', gerarFluxoVendedor);
afiliadosIaRoutes.post('/divulgar/telegram', divulgarNoTelegram);
afiliadosIaRoutes.post('/webhook/hotmart', receberWebhookHotmart);
afiliadosIaRoutes.get('/oportunidades', relatorioOportunidades);
afiliadosIaRoutes.get('/dashboard', obterDashboard);

// Gera um rascunho revisável para TikTok; não publica conteúdo externamente.
afiliadosIaRoutes.post('/tiktok/roteiro', mercadoLivreAdminGuard, (req, res) => {
  try {
    const content = generateTikTokAffiliatePackage(req.body || {});
    return res.status(200).json({ success: true, content });
  } catch (error) {
    const code = error instanceof Error ? error.message : 'TIKTOK_CONTENT_GENERATION_FAILED';
    const knownErrors = new Set([
      'TIKTOK_PRODUCT_NAME_REQUIRED',
      'TIKTOK_AFFILIATE_URL_REQUIRED',
      'TIKTOK_DURATION_INVALID',
      'TIKTOK_AFFILIATE_URL_INVALID'
    ]);
    return res.status(knownErrors.has(code) ? 400 : 500).json({ success: false, error: code });
  }
});
