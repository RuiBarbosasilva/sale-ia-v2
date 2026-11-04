import 'dotenv/config';
import { affiliateHunterRoutes } from './routes/affiliateHunterRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import affiliateRoutes from './routes/affiliateRoutes';
import { credenciaisRoutes } from './modules/credenciais/credenciais.routes';
import prospectingRoutes from './routes/prospectingRoutes';
import websiteRoutes from './routes/websiteRoutes';

import affiliateIntelligenceRoutes from './routes/affiliateIntelligenceRoutes';
import affiliateActionRoutes from './routes/affiliateActionRoutes';
import affiliateNetworkSecurityRoutes from './routes/affiliateNetworkSecurityRoutes';
import affiliatePublicRoutes from './routes/affiliatePublicRoutes';
import affiliateSalesStrategyRoutes from './routes/affiliateSalesStrategyRoutes';
import hotmartRoutes from './routes/hotmartRoutes';
import braipRoutes from './routes/braipRoutes';
import hunterRoutes from './routes/hunterRoutes';
import mlRoutes from './modules/mercadoLivre/routes/mercadoLivreRoutes';
import cookieParser from 'cookie-parser';
import express from 'express';
import templateImportRoutes from './routes/templateImportRoutes';
import demoPreviewRoutes from './routes/demoPreviewRoutes';
import mlSellerRoutes from './routes/mlSellerRoutes';
import contentFactoryRoutes from './routes/contentFactoryRoutes';
import publisherRoutes from './routes/publisherRoutes';
import apiRoutes from './routes/apiRoutes';
import { errorHandler } from './middlewares/errorHandler';
import { requestId, securityHeaders } from './middlewares/security';
import editorialFactoryRoutes from './routes/editorialFactoryRoutes';
import seniorSalesRoutes from './routes/seniorSalesRoutes';
import salesOrchestrationRoutes from './routes/salesOrchestrationRoutes';
import opportunitySalesBridgeRoutes from './routes/opportunitySalesBridgeRoutes';
import rbFactorySalesRoutes from './routes/rbFactorySalesRoutes';
import rbFactorySalesAgentRoutes from './routes/rbFactorySalesAgentRoutes';
import rbFactorySalesAutonomyRoutes from './routes/rbFactorySalesAutonomyRoutes';
import rbFactorySiteMaintenanceRoutes from './routes/rbFactorySiteMaintenanceRoutes';
import rbFactoryCommercialRoutes from './routes/rbFactoryCommercialRoutes';
import authRoutes from './routes/authRoutes';
import { startRbFactoryMaintenanceJob } from './jobs/rbFactoryMaintenanceJob';
import { afiliadosIaRoutes } from './modules/afiliados-ia/afiliados-ia.routes';
import { factoryEbookRoutes } from './modules/factory-ebook/factory-ebook.routes';
import produtosRoutes from './modules/afiliados-ia/routes/produtos.routes';
import { handleAffiliateWebhook } from './modules/afiliados-ia/controllers/webhook.controller';
import contentGeneratorRoutes from './modules/afiliados-ia/routes/contentGenerator.routes';
import blogFactoryRoutes from './modules/blogFactory/blogFactory.routes';

const app = express();

app.disable('x-powered-by');
app.set('query parser', 'simple');

app.use(requestId);
app.use(securityHeaders);
app.use(express.json({
  limit: process.env.JSON_BODY_LIMIT || '1mb',
  strict: true,
}));
app.use(cookieParser());

app.use((req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = function(data) {
    this.setHeader('Content-Type', 'application/json; charset=utf-8');
    return originalJson(data);
  };
  next();
});

// ForÃƒÆ’Ã‚Â§a UTF-8 nas pÃƒÆ’Ã‚Â¡ginas HTML para evitar mojibake em ambientes Windows/proxies.
app.use((req, res, next) => {
  const htmlRoutes = ['/affiliates', '/affiliates/admin', '/affiliates/intelligence', '/editorial', '/sales', '/dashboard', '/dashboard/', '/rb-factory', '/rb-factory-benchmark', '/rb-factory-maintenance', '/rb-factory-commercial', '/mercadolivre', '/mercadolivre/dropshipping'];
  if (htmlRoutes.includes(req.path) || req.path.endsWith('.html')) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
  }
  next();
});

app.use(express.static('public', { index: false }));
app.get('/login', (_req, res) => res.sendFile('login.html', { root: 'public' }));
app.get('/manual', (_req: any, res: any) => res.sendFile('manual.html', { root: 'public' }));

app.get('/', (_req, res) => res.redirect(302, '/rb-factory'));
app.get('/rb-factory', (_req, res) => { res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate'); res.setHeader('Pragma', 'no-cache'); res.setHeader('Expires', '0'); return res.sendFile('site-factory.html', { root: 'public' }); });
app.get('/affiliates', (_req, res) => res.sendFile('affiliates/index.html', { root: 'public' }));
app.get('/affiliates/admin', (_req, res) => res.sendFile('affiliates/admin.html', { root: 'public' }));
app.get('/affiliates/intelligence', (_req, res) => res.sendFile('affiliates/intelligence.html', { root: 'public' }));
app.get('/editorial', (_req, res) => res.sendFile('editorial/index.html', { root: 'public' }));
app.get('/sales', (_req, res) => res.sendFile('sales/index.html', { root: 'public' }));
app.get(['/dashboard', '/dashboard/'], (_req, res) => res.sendFile('dashboard/index.html', { root: 'public' }));
app.get('/rb-factory-benchmark', (_req, res) => res.sendFile('rb-factory-benchmark/index.html', { root: 'public' }));
app.get('/rb-factory-maintenance', (_req, res) => res.sendFile('rb-factory-maintenance.html', { root: 'public' }));
app.get('/rb-factory-commercial', (_req, res) => res.sendFile('rb-factory-commercial.html', { root: 'public' }));
app.get(['/mercadolivre', '/mercadolivre/dropshipping'], (_req, res) => res.sendFile('dropshipping-lab.html', { root: 'public' }));
app.use('/generated-images', express.static('storage/generated-images'));

app.use('/api', apiRoutes);
app.use('/api', authRoutes);
app.use('/api/websites/prospecting', prospectingRoutes);
app.use('/api/websites', websiteRoutes);
app.use('/api/affiliates', affiliateRoutes);
app.use('/api/affiliate', affiliateRoutes);
app.use('/api/affiliate-intelligence', affiliateIntelligenceRoutes);
app.use('/api/affiliate-actions', affiliateActionRoutes);
app.use('/api/affiliate-networks', affiliateNetworkSecurityRoutes);
app.use('/api/affiliate-hotmart', hotmartRoutes);
app.use('/api/affiliate-strategy', affiliateSalesStrategyRoutes);
app.use('/api/braip', braipRoutes);
app.use('/api/hunter', hunterRoutes);
app.use('/api/editorial', editorialFactoryRoutes);
app.use('/api/sales', seniorSalesRoutes);
app.use('/api/sales-orchestration', salesOrchestrationRoutes);
app.use('/api/opportunity-sales', opportunitySalesBridgeRoutes);

app.use('/api/rb-factory-sales', rbFactorySalesRoutes);
app.use('/api/rb-factory-sales-agent', rbFactorySalesAgentRoutes);
app.use('/api/rb-factory-sales-autonomy', rbFactorySalesAutonomyRoutes);
app.use('/api/rb-factory-maintenance', rbFactorySiteMaintenanceRoutes);
app.use('/api/rb-factory-commercial', rbFactoryCommercialRoutes);

app.use('/go', affiliatePublicRoutes);
app.use('/api/mercadolivre', mlRoutes);
app.use('/api/credenciais', credenciaisRoutes);
app.use('/dashboard', dashboardRoutes);

startRbFactoryMaintenanceJob();

// ==========================================
// ROTAS DO MÃƒÆ’Ã¢â‚¬Å“DULO AFILIADOS IA E OUTROS
// (DEVEM VIR ANTES DO errorHandler)
// ==========================================
app.post('/api/affiliates/webhook/:provider', handleAffiliateWebhook);
app.use('/api/factory-ebook', factoryEbookRoutes);
app.use('/api/afiliados', afiliadosIaRoutes);
app.use('/api/afiliados/produtos', produtosRoutes); // <-- CORREÃƒÆ’Ã¢â‚¬Â¡ÃƒÆ’Ã†â€™O: Rota agora conectada!
app.use('/api/publishers', publisherRoutes);
app.use('/api/ml-seller', mlSellerRoutes);
app.use('/api/content-factory', contentFactoryRoutes);

// ==========================================
// ROTAS DE CONTEÃƒÆ’Ã…Â¡DO DE AFILIADOS
// (DEVEM VIR ANTES DO errorHandler)
// ==========================================
app.use('/api/afiliados/conteudo', contentGeneratorRoutes);
app.use('/api/blog-factory', blogFactoryRoutes);

// ==========================================
// MIDDLEWARE DE ERRO (DEVE SER O ÃƒÆ’Ã…Â¡LTIMO)
// ==========================================
app.use(errorHandler);

export default app;
