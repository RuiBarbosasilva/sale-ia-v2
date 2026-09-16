// src/modules/mercadoLivre/notifications/webhookController.ts
import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export const handleWebhook = async (req: Request, res: Response) => {
  const { topic, resource, user_id } = req.body;

  // 1. Responder IMEDIATAMENTE ao Mercado Livre para evitar retentativas agressivas (429)
  res.status(200).send('OK');

  try {
    // Extrair resourceId de forma segura (pode vir como string ou objeto dependendo do tópico)
    const resourceId = typeof resource === 'string' ? resource : JSON.stringify(resource);

    // 2. Verificar Idempotência (usando findFirst, já que 'id' é a única chave única no schema atual)
    const existingEvent = await prisma.mercadoLivreWebhookEvent.findFirst({
      where: { topic, resourceId },
      orderBy: { createdAt: 'desc' }
    });

    if (existingEvent?.processed) {
      console.log(`[ML Webhook] Evento ignorado (já processado): ${topic} - ${resourceId}`);
      return;
    }

    if (existingEvent) {
      // Se existe mas não foi processado (ex: falha anterior), atualiza o payload e marca para reprocessamento
      await prisma.mercadoLivreWebhookEvent.update({
        where: { id: existingEvent.id },
        data: { 
          processed: false,
          payload: JSON.stringify(req.body) 
        }
      });
    } else {
      // Se não existe, cria um novo registro
      await prisma.mercadoLivreWebhookEvent.create({
        data: {
          topic,
          resourceId,
          payload: JSON.stringify(req.body),
          processed: false,
        }
      });
    }

    // 3. Disparar para fila de processamento em background (Exemplo)
    // eventBus.emit('ML_WEBHOOK_RECEIVED', { topic, resourceId, userId: user_id });
    // O worker irá buscar os eventos com processed=false, consultar a API do ML e marcar como processed=true

  } catch (error) {
    console.error('[ML Webhook] Erro ao registrar evento:', error);
  }
};
