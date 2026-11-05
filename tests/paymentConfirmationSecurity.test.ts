import express from 'express';
import request from 'supertest';

import paymentRoutes from '../src/routes/paymentRoutes';
import checkoutRoutes from '../src/routes/checkoutRoutes';

const app = express();
app.use(express.json());
app.use('/api/payments', paymentRoutes);
app.use('/api/checkout', checkoutRoutes);

describe('Payment confirmation security', () => {
  const previousAdminKey = process.env.SALE_IA_ADMIN_KEY;
  const previousPaymentSecret = process.env.PAYMENT_WEBHOOK_SECRET;
  const previousNodeEnv = process.env.NODE_ENV;

  beforeAll(() => {
    delete process.env.SALE_IA_ADMIN_KEY;
    process.env.PAYMENT_WEBHOOK_SECRET = 'payment-webhook-test-secret';
    process.env.NODE_ENV = 'test';
  });

  afterAll(() => {
    if (previousAdminKey === undefined) delete process.env.SALE_IA_ADMIN_KEY;
    else process.env.SALE_IA_ADMIN_KEY = previousAdminKey;
    if (previousPaymentSecret === undefined) delete process.env.PAYMENT_WEBHOOK_SECRET;
    else process.env.PAYMENT_WEBHOOK_SECRET = previousPaymentSecret;
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  });

  it('rejects payment webhook requests without the dedicated secret', async () => {
    const response = await request(app).post('/api/payments/webhook').send({
      orderId: 'order-forged',
      transactionId: 'transaction-forged',
      amount: 250
    });
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('PAYMENT_WEBHOOK_UNAUTHORIZED');
  });

  it('rejects payment webhook requests with an invalid secret', async () => {
    const response = await request(app)
      .post('/api/payments/webhook')
      .set('x-payment-webhook-secret', 'wrong-secret')
      .send({ orderId: 'order-forged', transactionId: 'transaction-forged', amount: 250 });
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('PAYMENT_WEBHOOK_UNAUTHORIZED');
  });

  it('protects the manual PIX payment simulation endpoint', async () => {
    const response = await request(app)
      .post('/api/checkout/pix/order-forged/simulate-payment')
      .send({});
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('ADMIN_UNAUTHORIZED');
  });
});
