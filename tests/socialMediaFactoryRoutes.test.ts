import request from 'supertest';
import app from '../src/app';

describe('RB-Factory-Social-Media routes', () => {
  const originalKey = process.env.SALE_IA_ADMIN_KEY;

  beforeEach(() => {
    process.env.SALE_IA_ADMIN_KEY = 'social-media-test-secret';
  });

  afterAll(() => {
    if (originalKey === undefined) delete process.env.SALE_IA_ADMIN_KEY;
    else process.env.SALE_IA_ADMIN_KEY = originalKey;
  });

  it('serves the Social Media Factory dashboard', async () => {
    const response = await request(app).get('/social-media-factory');
    expect(response.status).toBe(200);
    expect(response.text).toContain('Social Media Factory IA');
  });

  it('rejects protected API requests without the administrative key', async () => {
    const response = await request(app).get('/api/social-media-factory/status');
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Acesso não autorizado.');
  });

  it('rejects an incorrect administrative key before accessing data', async () => {
    const response = await request(app)
      .get('/api/social-media-factory/status')
      .set('x-sale-ia-admin-key', 'incorrect-secret');
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Acesso não autorizado.');
  });
});
