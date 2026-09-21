import 'dotenv/config';
import dashboardRoutes from './routes/dashboardRoutes';
import prospectingRoutes from './routes/prospectingRoutes';
import affiliateRoutes from './routes/affiliateRoutes';
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
import { rbFactorySalesAutonomyService } from './services/rbFactorySalesAutonomyService';
import rbFactoryWhatsAppRoutes from './routes/rbFactoryWhatsAppRoutes';

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

// RB Factory Sites é a porta de entrada única do sistema web local.
// O dashboard antigo continua disponível em /dashboard, mas a raiz abre a Factory.
app.get('/', (_req, res) => res.sendFile('site-factory.html', { root: 'public' }));
app.get('/site-factory.html', (_req, res) => res.redirect(302, '/'));

app.use(express.static('public'));
app.get('/affiliates', (_req, res) => res.sendFile('affiliates/index.html', { root: 'public' }));
app.get('/affiliates/admin', (_req, res) => res.sendFile('affiliates/admin.html', { root: 'public' }));
app.get('/affiliates/intelligence', (_req, res) => res.sendFile('affiliates/intelligence.html', { root: 'public' }));
app.get('/editorial', (_req, res) => res.sendFile('editorial/index.html', { root: 'public' }));
app.get('/sales', (_req, res) => res.sendFile('sales/index.html', { root: 'public' }));
app.get('/rb-factory-benchmark', (_req, res) => res.sendFile('rb-factory-benchmark/index.html', { root: 'public' }));
app.use('/generated-images', express.static('storage/generated-images'));

app.use('/api', apiRoutes);
app.use('/api/websites/prospecting', prospectingRoutes);
app.use('/api/affiliates', affiliateRoutes);
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
app.use('/api/rb-factory-sales-autonomy', rbFactorySalesAutonomyRoutes);
void rbFactorySalesAutonomyService.bootstrap();
app.use('/api/rb-factory-whatsapp', rbFactoryWhatsAppRoutes);
app.use('/go', affiliatePublicRoutes);
app.use('/api/mercadolivre', mlRoutes);
app.use('/dashboard', dashboardRoutes);
app.use(errorHandler);

export default app;
