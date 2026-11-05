import express from 'express';
import request from 'supertest';

import webhookRoutes from '../src/routes/webhookRoutes';

const app = express();
app.use(express.json());
app.use('/api/webhook', webhookRoutes);

describe('WhatsApp inbound webhook authentication', () => {
  const previousSecret = process.env.WHATSAPP_WEBHOOK_SECRET;
  const previousNodeEnv = process.env.NODE_ENV;

  afterAll(() => {
    if (previousSecret === undefined) delete process.env.WHATSAPP_WEBHOOK_SECRET;
    else process.env.WHATSAPP_WEBHOOK_SECRET = previousSecret;
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  });

  it('fails closed in production when the webhook secret is not configured', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.WHATSAPP_WEBHOOK_SECRET;

    const response = await request(app).post('/api/webhook').send({ event: 'noop' });
    expect(response.status).toBe(503);
    expect(response.body.error).toBe('WHATSAPP_WEBHOOK_SECRET_NOT_CONFIGURED');
  });

  it('rejects requests with an invalid webhook secret', async () => {
    process.env.NODE_ENV = 'production';
    process.env.WHATSAPP_WEBHOOK_SECRET = 'whatsapp-webhook-test-secret';

    const response = await request(app)
      .post('/api/webhook/whatsapp')
      .set('x-whatsapp-webhook-secret', 'wrong-secret')
      .send({ event: 'noop' });
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('WHATSAPP_WEBHOOK_UNAUTHORIZED');
  });

  it('accepts an authenticated webhook without triggering message processing for unrelated events', async () => {
    process.env.NODE_ENV = 'production';
    process.env.WHATSAPP_WEBHOOK_SECRET = 'whatsapp-webhook-test-secret';

    const response = await request(app)
      .post('/api/webhook')
      .set('x-whatsapp-webhook-secret', 'whatsapp-webhook-test-secret')
      .send({ event: 'noop' });
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
