import { Router, Request, Response, NextFunction } from 'express';
import { adminAuthorization, rateLimit, timingSafeSecret } from '../../middlewares/security';
import { generateTikTokAffiliatePackage } from './services/tiktokAffiliateContent.service';
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

export const afiliadosIaRoutes = Router();

// O webhook é público para a Hotmart, mas exige segredo próprio em cada chamada.
function hotmartWebhookGuard(req: Request, res: Response, next: NextFunction) {
  if (!timingSafeSecret(process.env.AFFILIATE_WEBHOOK_KEY, req.header('x-affiliate-webhook-key'))) {
    return res.status(401).json({ success: false, error: 'AFFILIATE_WEBHOOK_UNAUTHORIZED' });
  }
  return next();
}

afiliadosIaRoutes.post('/webhook/hotmart', hotmartWebhookGuard, receberWebhookHotmart);

// Todas as rotas operacionais e administrativas exigem a chave SALE-IA.
afiliadosIaRoutes.use(adminAuthorization);

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

afiliadosIaRoutes.get('/oportunidades', relatorioOportunidades);
afiliadosIaRoutes.get('/dashboard', obterDashboard);

 
// Generates a reviewable TikTok affiliate draft; it never publishes externally.
function tiktokAffiliateAdminGuard(req: Request, res: Response, next: NextFunction) {
  const affiliateKeyValid = timingSafeSecret(process.env.AFFILIATE_ADMIN_KEY, req.header('x-affiliate-admin-key'));
  const saleIaKeyValid = timingSafeSecret(process.env.SALE_IA_ADMIN_KEY, req.header('x-sale-ia-admin-key'));
  if (!affiliateKeyValid && !saleIaKeyValid) {
    return res.status(401).json({ success: false, error: 'AFFILIATE_ADMIN_UNAUTHORIZED' });
  }
  return next();
}

afiliadosIaRoutes.post(
  '/tiktok/roteiro',
  rateLimit({ name: 'tiktok-affiliate-admin', windowMs: 5 * 60 * 1000, limit: 20 }),
  tiktokAffiliateAdminGuard,
  (req, res) => {
    try {
      const generated = generateTikTokAffiliatePackage(req.body || {});
      return res.status(200).json({ success: true, content: generated });
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
  }
);
