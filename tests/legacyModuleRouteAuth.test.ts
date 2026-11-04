import express from 'express';
import request from 'supertest';

import { afiliadosIaRoutes } from '../src/modules/afiliados-ia/afiliados-ia.routes';
import produtosRoutes from '../src/modules/afiliados-ia/routes/produtos.routes';
import contentGeneratorRoutes from '../src/modules/afiliados-ia/routes/contentGenerator.routes';
import { factoryEbookRoutes } from '../src/modules/factory-ebook/factory-ebook.routes';

const app = express();
app.use(express.json());
app.use('/api/afiliados', afiliadosIaRoutes);
app.use('/api/afiliados/produtos', produtosRoutes);
app.use('/api/afiliados/conteudo', contentGeneratorRoutes);
app.use('/api/factory-ebook', factoryEbookRoutes);

describe('Legacy module route authorization', () => {
  const previousAdminKey = process.env.SALE_IA_ADMIN_KEY;
  const previousWebhookKey = process.env.AFFILIATE_WEBHOOK_KEY;

  beforeAll(() => {
    process.env.SALE_IA_ADMIN_KEY = 'route-auth-test-admin-secret';
    process.env.AFFILIATE_WEBHOOK_KEY = 'route-auth-test-webhook-secret';
  });

  afterAll(() => {
    if (previousAdminKey === undefined) delete process.env.SALE_IA_ADMIN_KEY;
    else process.env.SALE_IA_ADMIN_KEY = previousAdminKey;
    if (previousWebhookKey === undefined) delete process.env.AFFILIATE_WEBHOOK_KEY;
    else process.env.AFFILIATE_WEBHOOK_KEY = previousWebhookKey;
  });

  it('rejects affiliate operational routes without the admin key', async () => {
    const response = await request(app).post('/api/afiliados/hunter/executar').send({});
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('ADMIN_UNAUTHORIZED');
  });

  it('rejects affiliate product listing without the admin key', async () => {
    const response = await request(app).get('/api/afiliados/produtos');
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('ADMIN_UNAUTHORIZED');
  });

  it('rejects affiliate content generation without the admin key', async () => {
    const response = await request(app).post('/api/afiliados/conteudo/gerar-conteudo/lote').send({});
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('ADMIN_UNAUTHORIZED');
  });

  it('rejects Factory Ebook operations without the admin key', async () => {
    const response = await request(app).get('/api/factory-ebook/amazon/tendencias');
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('ADMIN_UNAUTHORIZED');
  });

  it('rejects Hotmart events without the dedicated webhook secret', async () => {
    const response = await request(app).post('/api/afiliados/webhook/hotmart').send({
      event: 'PURCHASE_APPROVED',
      data: { transaction: { hid: 'forged-transaction', price: { value: 100 }, commission: { value: 50 } } }
    });
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('AFFILIATE_WEBHOOK_UNAUTHORIZED');
  });

  it('rejects Hotmart events with an invalid webhook secret', async () => {
    const response = await request(app)
      .post('/api/afiliados/webhook/hotmart')
      .set('x-affiliate-webhook-key', 'wrong-secret')
      .send({ event: 'PURCHASE_APPROVED' });
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('AFFILIATE_WEBHOOK_UNAUTHORIZED');
  });
});
