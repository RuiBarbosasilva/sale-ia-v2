import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import express from 'express';
import pricingRouter from '../src/routes/pricing';

const prisma = new PrismaClient();

const app = express();
app.use(express.json());
app.use('/api', pricingRouter);

describe('Pricing API - Fluxo E2E de Cota��o e Negocia��o', () => {
  let createdQuoteId: string;

  beforeAll(async () => {
    await prisma.product.upsert({
      where: { id: 'test-caneca-porcelana-id' },
      update: {
        salePrice: 28,
        costPrice: 10,
        active: true
      },
      create: {
        id: 'test-caneca-porcelana-id',
        name: 'Caneca Personalizada Porcelana Teste',
        niche: 'Brindes',
        salePrice: 28,
        costPrice: 10,
        active: true,
        stock: 1000
      }
    });
  });
  afterAll(async () => {
    await prisma.quote.deleteMany({
      where: { productId: 'test-caneca-porcelana-id' }
    });
    await prisma.$disconnect();
  });

  describe('POST /api/quote', () => {
    it('deve gerar uma cota��o com sucesso para produto existente', async () => {
      const response = await request(app)
        .post('/api/quote')
        .send({
          productName: 'Caneca Personalizada Porcelana Teste',
          quantity: 100
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('quoteId');
      expect(response.body.unitPrice).toBe(28);
      expect(response.body.minimumUnitPrice).toBe(20);
      expect(response.body.total).toBe(2800);

      createdQuoteId = response.body.quoteId;
    });

    it('deve retornar erro 400 ao solicitar produto inexistente', async () => {
      const response = await request(app)
        .post('/api/quote')
        .send({
          productName: 'Produto Que Nao Existe 12345',
          quantity: 10
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/negotiate', () => {
    it('deve aprovar negocia��o dentro da margem permitida (20% desconto)', async () => {
      const response = await request(app)
        .post('/api/negotiate')
        .send({
          quoteId: createdQuoteId,
          requestedDiscountPct: 20
        });

      expect(response.status).toBe(200);
      expect(response.body.approved).toBe(true);
      expect(response.body.accepted).toBe(true);
      expect(response.body.requiresHumanEscalation).toBe(false);
      expect(response.body.newUnitPrice).toBeCloseTo(22.4, 2);
      expect(response.body.newTotal).toBeCloseTo(2240, 2);
    });

    it('deve recusar negocia��o abusiva abaixo do pre�o m�nimo (60% desconto)', async () => {
      const quoteRes = await request(app)
        .post('/api/quote')
        .send({
          productName: 'Caneca Personalizada Porcelana Teste',
          quantity: 100
        });

      const response = await request(app)
        .post('/api/negotiate')
        .send({
          quoteId: quoteRes.body.quoteId,
          requestedDiscountPct: 60
        });

      expect(response.status).toBe(200);
      expect(response.body.approved).toBe(false);
      expect(response.body.accepted).toBe(false);
      expect(response.body.requiresHumanEscalation).toBe(true);
      expect(response.body.counterOfferUnitPrice).toBe(20);
      expect(response.body.reason).toContain('abaixo do mínimo permitido');
    });
  });
});


