import express from 'express';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { generatePixPayload, generatePixImageBase64 } from '../src/services/pixService';

jest.mock('@prisma/client', () => {
  const prisma = {
    lead: { create: jest.fn() },
    order: { create: jest.fn(), update: jest.fn() },
    pixPayment: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    $transaction: jest.fn()
  };
  return { PrismaClient: jest.fn(() => prisma) };
});

jest.mock('../src/services/pixService', () => ({
  generatePixPayload: jest.fn(() => '000201PIX-PAYLOAD-TEST'),
  generatePixImageBase64: jest.fn(async () => 'data:image/png;base64,cGl4')
}));

import checkoutRoutes from '../src/routes/checkoutRoutes';

const app = express();
app.use(express.json());
app.use('/api/checkout', checkoutRoutes);
const prisma = new PrismaClient() as any;

describe('Checkout PIX generation', () => {
  const previousPixKey = process.env.PIX_KEY;
  const previousPixName = process.env.PIX_NAME;
  const previousPixCity = process.env.PIX_CITY;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.PIX_KEY = 'recebedor@example.com';
    process.env.PIX_NAME = 'SALE IA';
    process.env.PIX_CITY = 'POCOS DE CALDAS';
    prisma.lead.create.mockResolvedValue({ id: 'lead-123' });
    prisma.order.create.mockResolvedValue({ id: 'order-12346789012345678901234567890', leadId: 'lead-123', totalValue: 89.9, status: 'PENDING' });
    prisma.pixPayment.create.mockImplementation(async ({ data }: any) => ({ id: 'pix-1', ...data }));
    prisma.$transaction.mockImplementation(async (callback: (tx: any) => Promise<unknown>) => callback(prisma));
  });

  afterAll(() => {
    if (previousPixKey === undefined) delete process.env.PIX_KEY;
    else process.env.PIX_KEY = previousPixKey;
    if (previousPixName === undefined) delete process.env.PIX_NAME;
    else process.env.PIX_NAME = previousPixName;
    if (previousPixCity === undefined) delete process.env.PIX_CITY;
    else process.env.PIX_CITY = previousPixCity;
  });

  it('refuses to create an order when PIX receiver key is not configured', async () => {
    delete process.env.PIX_KEY;
    const response = await request(app).post('/api/checkout/generate-pix').send({ totalValue: 89.9 });
    expect(response.status).toBe(503);
    expect(response.body.error).toBe('PIX_NOT_CONFIGURED');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('generates the PIX payload and QR from configured receiver details', async () => {
    const response = await request(app).post('/api/checkout/generate-pix').send({ totalValue: 89.9 });

    expect(response.status).toBe(200);
    expect(response.body.paymentMode).toBe('STATIC_PIX');
    expect(response.body.pix.pixCode).toBe('000201PIX-PAYLOAD-TEST');
    expect(response.body.pix.qrCodeUrl).toBe('data:image/png;base64,cGl4');
    expect(generatePixPayload).toHaveBeenCalledWith(expect.objectContaining({
      key: 'recebedor@example.com',
      name: 'SALE IA',
      city: 'POCOS DE CALDAS',
      amount: 89.9,
      txId: '56789012345678901234567890'
    }));
    expect(generatePixImageBase64).toHaveBeenCalledWith('000201PIX-PAYLOAD-TEST');
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('rejects non-positive and non-numeric amounts before opening a transaction', async () => {
    const zero = await request(app).post('/api/checkout/generate-pix').send({ totalValue: 0 });
    const invalid = await request(app).post('/api/checkout/generate-pix').send({ totalValue: 'invalid' });
    expect(zero.status).toBe(400);
    expect(invalid.status).toBe(400);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('does not return a partial checkout when QR generation fails', async () => {
    (generatePixImageBase64 as jest.Mock).mockRejectedValueOnce(new Error('QR generation failed'));
    const response = await request(app).post('/api/checkout/generate-pix').send({ totalValue: 89.9 });

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('PIX_GENERATION_FAILED');
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });
});
