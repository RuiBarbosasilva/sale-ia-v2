import express from 'express';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import authRoutes from '../src/routes/authRoutes';
import { adminAuthMiddleware } from '../src/middleware/adminAuth.middleware';

describe('Admin authentication routes', () => {
  const originalSaleKey = process.env.SALE_IA_ADMIN_KEY;
  const originalAdminKey = process.env.ADMIN_KEY;
  const originalNodeEnv = process.env.NODE_ENV;
  const app = express();
  const protectedApp = express();

  beforeAll(() => {
    app.use(express.json());
    app.use('/api', authRoutes);
    protectedApp.use(cookieParser());
    protectedApp.get('/api/protected', adminAuthMiddleware, (_req, res) => res.json({ success: true }));
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
    const setCookie = response.headers['set-cookie'];
    const cookie = (Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : []).find(value => value.startsWith('adminKey='));
    expect(cookie).toBeDefined();
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(cookie).toMatch(/Path=\//i);
    expect(cookie).not.toContain('a-long-test-secret');
  });

  it('accepts the signed HttpOnly session cookie on protected routes', async () => {
    process.env.SALE_IA_ADMIN_KEY = 'a-long-test-secret';
    const login = await request(app).post('/api/verify-key').send({ key: 'a-long-test-secret' });
    const setCookie = login.headers['set-cookie'];
    const cookie = (Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : []).find(value => value.startsWith('adminKey='));
    expect(cookie).toBeDefined();
    const cookiePair = cookie!.split(';')[0];
    const response = await request(protectedApp).get('/api/protected').set('Cookie', cookiePair);
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('rejects a forged session cookie', async () => {
    process.env.SALE_IA_ADMIN_KEY = 'a-long-test-secret';
    const expiry = String(Date.now() + 60_000);
    const response = await request(protectedApp).get('/api/protected').set('Cookie', 'adminKey=v1.' + expiry + '.forged');
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('ADMIN_UNAUTHORIZED');
  });

  it('accepts the legacy ADMIN_KEY setting when the primary key is absent', async () => {
    process.env.ADMIN_KEY = 'legacy-test-secret';
    const response = await request(app).post('/api/verify-key').send({ key: 'legacy-test-secret' });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
