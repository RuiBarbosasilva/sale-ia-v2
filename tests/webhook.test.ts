import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import webhookRouter from '../src/routes/webhook';
import { evolutionService } from '../src/services/evolutionService';

const prisma = new PrismaClient();
const app = express();
app.use(express.json());
app.use('/api/webhook', webhookRouter);

describe('Webhook API - Entrada de Mensagens WhatsApp', () => {
  beforeAll(async () => {
    await prisma.product.upsert({
      where: { id: 'test-webhook-product' },
      update: {
        salePrice: 30,
        costPrice: 10,
        active: true
      },
      create: {
        id: 'test-webhook-product',
        name: 'Caneca Personalizada Webhook',
        niche: 'Brindes',
        salePrice: 30,
        costPrice: 10,
        active: true,
        stock: 500
      }
    });
  });
  afterAll(async () => {
    await prisma.quote.deleteMany({
      where: { productId: 'test-webhook-product' }
    });
    await prisma.$disconnect();
  });

  it('deve receber webhook da Evolution API e acionar o automationService', async () => {
    jest.spyOn(evolutionService, 'sendTextMessage').mockResolvedValue(true);

    const payload = {
      event: 'messages.upsert',
      data: {
        key: {
          remoteJid: '5535988888888@s.whatsapp.net',
          fromMe: false,
          id: 'MSG123456'
        },
        pushName: 'Rui Barbosa',
        message: {
          conversation: 'Quero 50 unidades de Caneca Personalizada Webhook com 10% de desconto'
        }
      }
    };

    const response = await request(app)
      .post('/api/webhook/whatsapp')
      .send(payload);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'RECEIVED' });
    expect(evolutionService.sendTextMessage).toHaveBeenCalledTimes(1);
  });
});


