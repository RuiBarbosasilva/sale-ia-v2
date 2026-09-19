// src/modules/mercadoLivre/notifications/webhookController.ts
import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const MAX_TOPIC_LENGTH = 80;
const MAX_RESOURCE_LENGTH = 500;

function normalizeResource(resource: unknown) {
  if (typeof resource !== 'string') throw new Error('INVALID_WEBHOOK_RESOURCE');
  if (resource.length < 1 || resource.length > MAX_RESOURCE_LENGTH) throw new Error('INVALID_WEBHOOK_RESOURCE');

  try {
    const url = new URL(resource);
    if (url.protocol !== 'https:' || url.hostname !== 'api.mercadolibre.com') {
      throw new Error('INVALID_WEBHOOK_RESOURCE');
    }
    return url.toString();
  } catch {
    throw new Error('INVALID_WEBHOOK_RESOURCE');
  }
}

function normalizeTopic(topic: unknown) {
  if (typeof topic !== 'string' || !/^[a-z0-9_.-]{1,80}$/i.test(topic)) {
    throw new Error('INVALID_WEBHOOK_TOPIC');
  }
  return topic.slice(0, MAX_TOPIC_LENGTH);
}

function normalizeUserId(userId: unknown) {
  const value = String(userId ?? '');
  if (!/^\d{1,30}$/.test(value)) throw new Error('INVALID_WEBHOOK_USER');
  return value;
}

export const handleWebhook = async (req: Request, res: Response) => {
  // Mercado Livre exige resposta rápida; validação e persistência são mantidas leves.
  let topic: string;
  let resourceId: string;
  let userId: string;

  try {
    topic = normalizeTopic(req.body?.topic);
    resourceId = normalizeResource(req.body?.resource);
    userId = normalizeUserId(req.body?.user_id);
    const configuredAppId = (process.env.MERCADO_LIVRE_APP_ID || '').trim();
    const notificationAppId = String(req.body?.application_id ?? '').trim();
    if (configuredAppId && notificationAppId && notificationAppId !== configuredAppId) {
      throw new Error('INVALID_WEBHOOK_APPLICATION');
    }
  } catch {
    return res.status(400).send('INVALID_WEBHOOK');
  }

  res.status(200).send('OK');

  try {
    const account = await prisma.mercadoLivreAccount.findFirst({
      where: { mlUserId: userId, isActive: true },
      select: { id: true }
    });

    if (!account) {
      console.warn('[ML Webhook] Conta não encontrada para usuário do evento', { userId });
      return;
    }

    const payload = JSON.stringify({
      topic,
      resource: resourceId,
      user_id: userId,
      application_id: String(req.body?.application_id ?? '').slice(0, 40),
      sent: req.body?.sent,
      attempts: req.body?.attempts,
    });

    const existingEvent = await prisma.mercadoLivreWebhookEvent.findFirst({
      where: { topic, resourceId },
      orderBy: { createdAt: 'desc' }
    });

    if (existingEvent?.processed) {
      return;
    }

    if (existingEvent) {
      await prisma.mercadoLivreWebhookEvent.update({
        where: { id: existingEvent.id },
        data: { processed: false, payload }
      });
    } else {
      await prisma.mercadoLivreWebhookEvent.create({
        data: {
          topic,
          resourceId,
          payload,
          processed: false,
        }
      });
    }
  } catch (error) {
    console.error('[ML Webhook] Falha ao registrar evento', {
      requestId: (req as any).requestId,
      code: error instanceof Error ? error.message : 'WEBHOOK_PERSISTENCE_FAILED'
    });
  }
};
