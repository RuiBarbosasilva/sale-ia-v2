// src/modules/mercadoLivre/notifications/notificationController.ts

// import { Request, Response } from 'express';
// import { prisma } from '@/core/database';

export const handleWebhook = async (req: any, res: any) => {
  const { topic, resource, user_id } = req.body;

  // 1. Responder imediatamente ao ML para evitar re-tentativas agressivas
  res.status(200).send('OK');

  try {
    // 2. Salvar evento para processamento assíncrono (Idempotência)
    // Como o SQLite não suporta 'Json' nativamente no Prisma, convertemos o payload para String
    
    const payloadString = JSON.stringify(req.body);
    // O 'resource' do ML pode vir como string ou objeto dependendo do tópico
    const resourceId = typeof resource === 'string' ? resource : JSON.stringify(resource);

    /*
    const existing = await prisma.mercadoLivreWebhookEvent.findFirst({
      where: { topic, resourceId }
    });
    if (existing && existing.processed) return;

    await prisma.mercadoLivreWebhookEvent.create({
      data: { 
        topic, 
        resourceId, 
        payload: payloadString 
      }
    });
    */

    // 3. Disparar para fila de processamento (Event Bus / Queue)
    // eventBus.emit('ML_NOTIFICATION_RECEIVED', { topic, resource, userId: user_id });

  } catch (error) {
    // logger.error('[Webhook] Erro ao processar notificação', error);
  }
};
