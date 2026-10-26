import express from 'express';
import request from 'supertest';
import authRoutes from '../src/routes/authRoutes';

describe('Admin authentication routes', () => {
  const originalSaleKey = process.env.SALE_IA_ADMIN_KEY;
  const originalAdminKey = process.env.ADMIN_KEY;
  const originalNodeEnv = process.env.NODE_ENV;
  const app = express();

  beforeAll(() => {
    app.use(express.json());
    app.use('/api', authRoutes);
  });

  beforeEach(() => {
    delete process.env.SALE_IA_ADMIN_KEY;
    delete process.env.ADMIN_KEY;
    process.env.NODE_ENV = 'test';
  });

  afterAll(() => {
    if (originalSaleKey === undefined) delete process.env.SALE_IA_ADMIN_KEY;
    else process.env.SALE_IA_ADMIN_KEY = originalSaleKey;
    if (originalAdminKey === undefined) delete process.env.ADMIN_KEY;
    else process.env.ADMIN_KEY = originalAdminKey;
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
  });

  it('fails closed when no admin key is configured', async () => {
    const response = await request(app).post('/api/verify-key').send({ key: 'sale-ia-2026-admin-key-secure' });
    expect(response.status).toBe(503);
    expect(response.body).toEqual({ success: false, error: 'ADMIN_KEY_NOT_CONFIGURED' });
    expect(response.headers['set-cookie']).toBeUndefined();
  });

  it('rejects an incorrect key', async () => {
    process.env.SALE_IA_ADMIN_KEY = 'a-long-test-secret';
    const response = await request(app).post('/api/verify-key').send({ key: 'wrong-secret' });
    expect(response.status).toBe(401);
    expect(response.headers['set-cookie']).toBeUndefined();
  });

  it('sets an HttpOnly SameSite=Lax cookie for the configured key', async () => {
    process.env.SALE_IA_ADMIN_KEY = 'a-long-test-secret';
    const response = await request(app).post('/api/verify-key').send({ key: 'a-long-test-secret' });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    const cookie = (response.headers['set-cookie'] as string[]).find(value => value.startsWith('adminKey='));
    expect(cookie).toBeDefined();
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(cookie).toMatch(/Path=\//i);
    expect(cookie).not.toContain('a-long-test-secret');
  });

  it('accepts the legacy ADMIN_KEY setting when the primary key is absent', async () => {
    process.env.ADMIN_KEY = 'legacy-test-secret';
    const response = await request(app).post('/api/verify-key').send({ key: 'legacy-test-secret' });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
