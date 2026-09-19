import 'dotenv/config';
import dashboardRoutes from './routes/dashboardRoutes';
import prospectingRoutes from './routes/prospectingRoutes';
import affiliateRoutes from './routes/affiliateRoutes';
import affiliateIntelligenceRoutes from './routes/affiliateIntelligenceRoutes';
import affiliateActionRoutes from './routes/affiliateActionRoutes';
import affiliateNetworkSecurityRoutes from './routes/affiliateNetworkSecurityRoutes';
import affiliatePublicRoutes from './routes/affiliatePublicRoutes';
import hotmartRoutes from './routes/hotmartRoutes';
import mlRoutes from './modules/mercadoLivre/routes/mercadoLivreRoutes';
import cookieParser from 'cookie-parser';
import express from 'express';
import apiRoutes from './routes/apiRoutes';
import { errorHandler } from './middlewares/errorHandler';
import editorialFactoryRoutes from './routes/editorialFactoryRoutes';

const app = express();

app.use(express.json())
app.use(cookieParser());;

// Servir arquivos estaticos do frontend
// Middleware UTF-8 inteligente (nÃ£o sobrescreve JSON)
app.use((req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = function(data) {
    this.setHeader('Content-Type', 'application/json; charset=utf-8');
    return originalJson(data);
  };
  next();
});

app.use(express.static('public'));
app.get('/affiliates', (_req, res) => res.sendFile('affiliates/index.html', { root: 'public' }));
app.get('/affiliates/admin', (_req, res) => res.sendFile('affiliates/admin.html', { root: 'public' }));
app.get('/affiliates/intelligence', (_req, res) => res.sendFile('affiliates/intelligence.html', { root: 'public' }));
app.get('/editorial', (_req, res) => res.sendFile('editorial/index.html', { root: 'public' }));
app.use('/generated-images', express.static('storage/generated-images'));

// Registra as rotas principais da API
app.use('/api', apiRoutes);

// RB Factory Sites - Prospecção
app.use('/api/websites/prospecting', prospectingRoutes);
app.use('/api/affiliates', affiliateRoutes);
app.use('/api/affiliate-intelligence', affiliateIntelligenceRoutes);
app.use('/api/affiliate-actions', affiliateActionRoutes);
app.use('/api/affiliate-networks', affiliateNetworkSecurityRoutes);
app.use('/api/affiliate-hotmart', hotmartRoutes);
app.use('/api/editorial', editorialFactoryRoutes);
app.use('/go', affiliatePublicRoutes);

// Middleware global de tratamento de erros
app.use(errorHandler);

export default app;

app.use('/api/mercadolivre', mlRoutes);
app.use('/dashboard', dashboardRoutes);

