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
import { timingSafeSecret } from '../../middlewares/security';
import { Request, Response, NextFunction } from 'express';
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
function tiktokAffiliateAdminGuard(req: Request, res: Response, next: NextFunction) {
  const expected = process.env.AFFILIATE_ADMIN_KEY || process.env.SALE_IA_ADMIN_KEY;
  const provided = req.header('x-affiliate-admin-key') || req.header('x-sale-ia-admin-key');
  if (!timingSafeSecret(expected, provided)) {
    return res.status(401).json({ success: false, error: 'AFFILIATE_ADMIN_UNAUTHORIZED' });
  }
  return next();
}

afiliadosIaRoutes.post('/tiktok/roteiro', tiktokAffiliateAdminGuard, (req, res) => {
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
