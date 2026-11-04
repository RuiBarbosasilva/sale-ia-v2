import express from 'express';
import request from 'supertest';

import editorialFactoryRoutes from '../src/routes/editorialFactoryRoutes';
import seniorSalesRoutes from '../src/routes/seniorSalesRoutes';
import salesOrchestrationRoutes from '../src/routes/salesOrchestrationRoutes';
import opportunitySalesBridgeRoutes from '../src/routes/opportunitySalesBridgeRoutes';
import affiliateSalesStrategyRoutes from '../src/routes/affiliateSalesStrategyRoutes';
import hunterRoutes from '../src/routes/hunterRoutes';
import hotmartRoutes from '../src/routes/hotmartRoutes';

const app = express();
app.use(express.json());
app.use('/api/editorial', editorialFactoryRoutes);
app.use('/api/sales', seniorSalesRoutes);
app.use('/api/sales-orchestration', salesOrchestrationRoutes);
app.use('/api/opportunity-sales', opportunitySalesBridgeRoutes);
app.use('/api/affiliate-strategy', affiliateSalesStrategyRoutes);
app.use('/api/hunter', hunterRoutes);
app.use('/api/affiliate-hotmart', hotmartRoutes);

describe('Sales and research API authorization', () => {
  const previousAdminKey = process.env.SALE_IA_ADMIN_KEY;

  beforeAll(() => {
    process.env.SALE_IA_ADMIN_KEY = 'sales-research-test-admin-secret';
  });

  afterAll(() => {
    if (previousAdminKey === undefined) delete process.env.SALE_IA_ADMIN_KEY;
    else process.env.SALE_IA_ADMIN_KEY = previousAdminKey;
  });

  it('keeps the editorial health check public but protects editorial operations', async () => {
    const health = await request(app).get('/api/editorial/health');
    expect(health.status).toBe(200);
    const research = await request(app).post('/api/editorial/research').send({});
    expect(research.status).toBe(401);
    expect(research.body.error).toBe('ADMIN_UNAUTHORIZED');
  });

  it('keeps the senior sales health check public but protects conversations and dashboard', async () => {
    const health = await request(app).get('/api/sales/health');
    expect(health.status).toBe(200);
    const dashboard = await request(app).get('/api/sales/dashboard');
    expect(dashboard.status).toBe(401);
    expect(dashboard.body.error).toBe('ADMIN_UNAUTHORIZED');
  });

  it('protects sales orchestration operations', async () => {
    const response = await request(app).get('/api/sales-orchestration/analytics');
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('ADMIN_UNAUTHORIZED');
  });

  it('protects opportunity sales plans and actions', async () => {
    const response = await request(app).get('/api/opportunity-sales/plans');
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('ADMIN_UNAUTHORIZED');
  });

  it('protects affiliate strategy data', async () => {
    const response = await request(app).get('/api/affiliate-strategy/portfolio');
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('ADMIN_UNAUTHORIZED');
  });

  it('protects hunter research and product operations', async () => {
    const response = await request(app).get('/api/hunter/dashboard');
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('ADMIN_UNAUTHORIZED');
  });

  it('protects Hotmart account and sales data', async () => {
    const response = await request(app).get('/api/affiliate-hotmart/sales');
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('ADMIN_UNAUTHORIZED');
  });
});
