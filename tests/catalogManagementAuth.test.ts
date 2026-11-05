import express from 'express';
import request from 'supertest';

import creativeRoutes from '../src/routes/creativeRoutes';
import supplierRoutes from '../src/routes/supplierRoutes';
import productRoutes from '../src/routes/productRoutes';
import leadRoutes from '../src/routes/leadRoutes';
import templateRoutes from '../src/routes/templateRoutes';
import categoryRoutes from '../src/routes/categoryRoutes';
import productSegmentRoutes from '../src/routes/productSegmentRoutes';

const app = express();
app.use(express.json());
app.use('/api/creatives', creativeRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/products', productRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/segments', productSegmentRoutes);

describe('Catalog and CRM management authorization', () => {
  const previousAdminKey = process.env.SALE_IA_ADMIN_KEY;

  beforeAll(() => {
    process.env.SALE_IA_ADMIN_KEY = 'catalog-management-test-admin-secret';
  });

  afterAll(() => {
    if (previousAdminKey === undefined) delete process.env.SALE_IA_ADMIN_KEY;
    else process.env.SALE_IA_ADMIN_KEY = previousAdminKey;
  });

  const protectedRequests: Array<[string, () => request.Test]> = [
    ['creative generation', () => request(app).post('/api/creatives/generate').send({})],
    ['supplier records', () => request(app).get('/api/suppliers')],
    ['product creation', () => request(app).post('/api/products').send({})],
    ['CRM lead listing', () => request(app).get('/api/leads')],
    ['website template creation', () => request(app).post('/api/templates').send({})],
    ['website category creation', () => request(app).post('/api/categories').send({})],
    ['product segment creation', () => request(app).post('/api/segments').send({})],
  ];

  it.each(protectedRequests)('requires admin authorization for %s', async (_name, buildRequest) => {
    const response = await buildRequest();
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('ADMIN_UNAUTHORIZED');
  });
});
