import express from 'express';
import request from 'supertest';

import { credenciaisRoutes } from '../src/modules/credenciais/credenciais.routes';
import publisherRoutes from '../src/routes/publisherRoutes';
import mlSellerRoutes from '../src/routes/mlSellerRoutes';
import contentFactoryRoutes from '../src/routes/contentFactoryRoutes';
import affiliateRoutes from '../src/routes/affiliateRoutes';
import affiliateIntelligenceRoutes from '../src/routes/affiliateIntelligenceRoutes';
import websiteRoutes from '../src/routes/websiteRoutes';

const app = express();
app.use(express.json());
app.use('/api/credenciais', credenciaisRoutes);
app.use('/api/publishers', publisherRoutes);
app.use('/api/ml-seller', mlSellerRoutes);
app.use('/api/content-factory', contentFactoryRoutes);
app.use('/api/affiliate', affiliateRoutes);
app.use('/api/affiliate-intelligence', affiliateIntelligenceRoutes);
app.use('/api/websites', websiteRoutes);

describe('Management API authorization', () => {
  const previousAdminKey = process.env.SALE_IA_ADMIN_KEY;

  beforeAll(() => {
    process.env.SALE_IA_ADMIN_KEY = 'management-api-test-admin-secret';
  });

  afterAll(() => {
    if (previousAdminKey === undefined) delete process.env.SALE_IA_ADMIN_KEY;
    else process.env.SALE_IA_ADMIN_KEY = previousAdminKey;
  });

  it('protects stored platform credentials', async () => {
    const response = await request(app).get('/api/credenciais');
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('ADMIN_UNAUTHORIZED');
  });

  it('protects Pinterest publishing operations', async () => {
    const response = await request(app).get('/api/publishers/pinterest/boards');
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('ADMIN_UNAUTHORIZED');
  });

  it('protects Mercado Livre listing creation', async () => {
    const response = await request(app).post('/api/ml-seller/create-listing').send({});
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('ADMIN_UNAUTHORIZED');
  });

  it('protects content generation endpoints', async () => {
    const response = await request(app).post('/api/content-factory/generate-one').send({});
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('ADMIN_UNAUTHORIZED');
  });

  it('protects affiliate product import operations', async () => {
    const response = await request(app).post('/api/affiliate/ml/add-urls').send({});
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('ADMIN_UNAUTHORIZED');
  });

  it('protects affiliate intelligence metrics and operations', async () => {
    const response = await request(app).get('/api/affiliate-intelligence/health');
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('ADMIN_UNAUTHORIZED');
  });

  it('protects RB Factory website generation APIs', async () => {
    const response = await request(app).post('/api/websites/generate').send({});
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('ADMIN_UNAUTHORIZED');
  });
});
