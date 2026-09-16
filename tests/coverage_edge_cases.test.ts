import request from 'supertest';
import express from 'express';
import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import webhookRouter from '../src/routes/webhook';
import { evolutionService } from '../src/services/evolutionService';
import { automationService } from '../src/services/automationService';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const app = express();
app.use(express.json());
app.use('/webhook', webhookRouter);

const prisma = new PrismaClient();

describe('Suíte de Cobertura Avançada - Edge Cases & Tratam. Erros', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('EvolutionService - Falhas de Conexão e Validação', () => {
    it('deve retornar false e logar erro quando a API da Evolution responder com erro HTTP (500)', async () => {
      mockedAxios.post.mockRejectedValueOnce({
        response: { status: 500, data: { message: 'Internal Server Error' } }
      });

      const result = await evolutionService.sendTextMessage({
        number: '+55 (35) 99999-9999',
        text: 'Teste erro HTTP'
      });

      expect(result).toBe(false);
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    });

    it('deve retornar false quando ocorrer erro de timeout/conexão recusada', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('connect ECONNREFUSED 127.0.0.1:8080'));

      const result = await evolutionService.sendTextMessage({
        number: '5535988887777',
        text: 'Teste conexão'
      });

      expect(result).toBe(false);
    });
  });

  describe('Webhook Route - Filtragem de Mensagens e Condições de Guarda', () => {
    it('deve ignorar mensagens enviadas pelo próprio usuário/bot (fromMe: true)', async () => {
      const response = await request(app)
        .post('/webhook/whatsapp')
        .send({
          data: {
            key: { remoteJid: '5535999998888@s.whatsapp.net', fromMe: true }
          }
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'RECEIVED' });
    });

    it('deve ignorar mensagens vindas de grupos (@g.us)', async () => {
      const response = await request(app)
        .post('/webhook/whatsapp')
        .send({
          data: {
            key: { remoteJid: '1203630123456789@g.us', fromMe: false }
          }
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'RECEIVED' });
    });

    it('deve ignorar payloads onde o corpo da mensagem venha vazio ou sem texto', async () => {
      const response = await request(app)
        .post('/webhook/whatsapp')
        .send({
          data: {
            key: { remoteJid: '5535999998888@s.whatsapp.net', fromMe: false },
            message: {}
          }
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'RECEIVED' });
    });

    it('deve retornar status 500 se ocorrer uma exceção não tratada ao processar', async () => {
      jest.spyOn(automationService, 'processAndRespondLead').mockRejectedValueOnce(new Error('Erro crítico de banco de dados'));

      const response = await request(app)
        .post('/webhook/whatsapp')
        .send({
          data: {
            key: { remoteJid: '5535999998888@s.whatsapp.net', fromMe: false },
            message: { conversation: '10 caixas' }
          }
        });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error', 'Erro crítico de banco de dados');
    });
  });

  describe('AutomationService - Resiliência e Produto Não Encontrado', () => {
    it('deve enviar mensagem de aviso quando o produto pesquisado não for localizado', async () => {
      mockedAxios.post.mockResolvedValueOnce({ status: 200, data: {} });

      const result = await automationService.processAndRespondLead({
        leadPhone: '5535977776666',
        leadName: 'João da Silva',
        productName: 'ProdutoInexistenteXyz123',
        quantity: 5
      });

      expect(result.success).toBe(false);
      expect(result.reason).toBe('PRODUCT_NOT_FOUND');
      expect(result.messageSent).toBe(true);
    });
  });
});
