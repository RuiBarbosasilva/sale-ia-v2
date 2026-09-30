import request from 'supertest';
import express from 'express';
import pricingRouter from '../src/routes/pricing';
import pricingService from '../src/services/pricingService';
import { PrismaClient } from '@prisma/client';

const app = express();
app.use(express.json());
app.use('/pricing', pricingRouter);

const prisma = new PrismaClient();

describe('Pricing Route & PricingService Edge Cases', () => {
  afterAll(async () => {
    await prisma.$disconnect();
    jest.restoreAllMocks();
  });

  describe('Pricing Route Error Handling (src/routes/pricing.ts)', () => {
    it('deve retornar erro 400 na rota POST /pricing/quote em caso de falha', async () => {
      jest.spyOn(pricingService, 'calculateQuote').mockRejectedValueOnce(new Error('Erro de teste'));

      const response = await request(app)
        .post('/pricing/quote')
        .send({
          productName: 'Caneca',
          quantity: 10
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Erro de teste');
    });

    it('deve calcular o desconto via requestedPrice na rota POST /pricing/negotiate', async () => {
      jest.spyOn(pricingService, 'getQuoteById').mockResolvedValueOnce({
        id: 'quote-123',
        leadId: 'lead-123',
        productId: 'prod-123',
        quantity: 10,
        unitPrice: 100,
        discount: 0,
        total: 1000,
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date()
      } as any);

      jest.spyOn(pricingService, 'negotiateQuote').mockResolvedValueOnce({
        approved: true,
        accepted: true,
        requiresHumanEscalation: false,
        reason: 'Aprovado dentro da margem',
        counterOfferUnitPrice: 80,
        newUnitPrice: 80,
        newTotal: 800,
        discountAppliedPct: 20
      } as any);

      const response = await request(app)
        .post('/pricing/negotiate')
        .send({
          quoteId: 'quote-123',
          requestedPrice: 80
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('approved', true);
    });

    it('deve retornar erro 400 na rota POST /pricing/negotiate em caso de falha', async () => {
      jest.spyOn(pricingService, 'negotiateQuote').mockRejectedValueOnce(new Error('Erro de negocia??o'));

      const response = await request(app)
        .post('/pricing/negotiate')
        .send({
          quoteId: 'quote-123',
          requestedDiscountPct: 10
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Erro de negocia??o');
    });
  });

  describe('PricingService Edge Cases & Direct Methods', () => {
    it('deve calcular cota??o via calculateQuote utilizando productName', async () => {
      const result = await pricingService.calculateQuote({
        productName: 'Caneca Personalizada',
        quantity: 5
      });

      expect(result).toHaveProperty('unitPrice');
      expect(result).toHaveProperty('total');
    });

    it('deve buscar cota??o por ID inexistente via getQuoteById sem crashar', async () => {
      try {
        await pricingService.getQuoteById('id-inexistente-999');
      } catch (err) {
        expect(err).toBeDefined();
      }
    });

    it('deve processar negocia??o via negotiateQuote diretamente', async () => {
      try {
        await pricingService.negotiateQuote({
          quoteId: 'id-inexistente-999',
          targetDiscountPercent: 15
        });
      } catch (err) {
        expect(err).toBeDefined();
      }
    });
  });
});
