// src/modules/mercadoLivre/workers/mercadoLivreWebhookWorker.ts
import { prisma } from '../lib/prisma';
import { mercadoLivreSyncService } from '../services/mercadoLivreSyncService';

const DEFAULT_INTERVAL_MS = 60000;
const BATCH_LIMIT = 20;

/**
 * Lista de topics suportados pelo worker.
 * Para habilitar um novo topic, basta adiciona-lo aqui E implementar o handler.
 * Topics fora desta lista NAO sao buscados nem marcados como processed,
 * permanecendo com processed=false ate que sejam implementados.
 */
const SUPPORTED_TOPICS: string[] = ['items'];

class MercadoLivreWebhookWorker {
  private timer: NodeJS.Timeout | null = null;
  private processing = false;
  private readonly intervalMs: number;

  constructor() {
    const raw = process.env.MERCADO_LIVRE_WEBHOOK_WORKER_INTERVAL_MS;
    const parsed = raw ? parseInt(raw, 10) : NaN;
    this.intervalMs = Number.isFinite(parsed) && parsed >= 5000 ? parsed : DEFAULT_INTERVAL_MS;
  }

  start(): void {
    if (this.timer) {
      console.log('[MercadoLivreWebhookWorker] já iniciado, ignorando segundo start');
      return;
    }
    console.log('[MercadoLivreWebhookWorker] iniciado');
    console.log(`[MercadoLivreWebhookWorker] intervalo: ${this.intervalMs}ms`);
    console.log(`[MercadoLivreWebhookWorker] topics suportados: ${SUPPORTED_TOPICS.join(', ')}`);
    this.timer = setInterval(() => { void this.runOnce(); }, this.intervalMs);
    void this.runOnce();
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log('[MercadoLivreWebhookWorker] parado');
    }
  }

  async runOnce(): Promise<void> {
    if (this.processing) {
      console.log('[MercadoLivreWebhookWorker] ciclo anterior em andamento, pulando');
      return;
    }
    this.processing = true;
    try {
      // SEGURANCA: buscar SOMENTE eventos de topics suportados.
      // Eventos de topics desconhecidos permanecem com processed=false
      // ate que o suporte seja implementado (evita perda silenciosa).
      const pending = await prisma.mercadoLivreWebhookEvent.findMany({
        where: {
          processed: false,
          topic: { in: SUPPORTED_TOPICS }
        },
        orderBy: { createdAt: 'asc' },
        take: BATCH_LIMIT
      });

      // Diagnosticar eventos "encalhados" de topics nao suportados (uma vez, sem spam)
      const stuckCount = await prisma.mercadoLivreWebhookEvent.count({
        where: {
          processed: false,
          topic: { notIn: SUPPORTED_TOPICS }
        }
      });

      console.log(`[MercadoLivreWebhookWorker] eventos pendentes (suportados): ${pending.length}`);
      if (stuckCount > 0) {
        console.log(`[MercadoLivreWebhookWorker] eventos pendentes (topics nao suportados): ${stuckCount} — aguardando implementacao`);
      }

      for (const event of pending) {
        await this.processEvent(event);
      }
    } catch (error: any) {
      console.error(`[MercadoLivreWebhookWorker] erro no ciclo: ${error.message}`);
    } finally {
      this.processing = false;
    }
  }

  private async processEvent(event: { id: string; topic: string; resourceId: string; payload: string | null }): Promise<void> {
    const eventId = event.id;
    try {
      // Defesa dupla: se por algum motivo um topic nao suportado chegar aqui,
      // NAO marcar como processado e NAO tentar processar.
      if (!SUPPORTED_TOPICS.includes(event.topic)) {
        console.log(`[MercadoLivreWebhookWorker] topic nao suportado (ignorado sem marcar processed): ${event.topic} — evento ${eventId}`);
        return;
      }

      console.log(`[MercadoLivreWebhookWorker] processando evento: ${eventId}`);
      console.log(`[MercadoLivreWebhookWorker] topic: ${event.topic}`);
      console.log(`[MercadoLivreWebhookWorker] resource: ${event.resourceId}`);

      if (event.topic === 'items') {
        const mlItemId = String(event.resourceId || '').split('/').filter(Boolean).pop() || '';
        if (!mlItemId) {
          console.error(`[MercadoLivreWebhookWorker] resourceId invalido no evento ${eventId} — justificativa: marcado como processado para nao travar a fila`);
          await prisma.mercadoLivreWebhookEvent.update({
            where: { id: eventId },
            data: { processed: true, processedAt: new Date() }
          });
          return;
        }

        const account = await this.resolveAccount(event);
        if (!account) {
          console.error(`[MercadoLivreWebhookWorker] nenhuma conta ativa para evento ${eventId} — mantendo pendente`);
          return;
        }

        try {
          const result = await mercadoLivreSyncService.syncSingleItem(account.id, mlItemId);
          console.log(`[MercadoLivreWebhookWorker] item atualizado: ${mlItemId} (${result.action})`);
        } catch (itemError: any) {
          const status = itemError?.response?.status;
          if (status === 404) {
            console.error(`[MercadoLivreWebhookWorker] item ${mlItemId} nao existe mais no ML (404) — justificativa: marcado como processado`);
            await prisma.mercadoLivreWebhookEvent.update({
              where: { id: eventId },
              data: { processed: true, processedAt: new Date() }
            });
            return;
          }
          throw itemError;
        }

        await prisma.mercadoLivreWebhookEvent.update({
          where: { id: eventId },
          data: { processed: true, processedAt: new Date() }
        });
        console.log(`[MercadoLivreWebhookWorker] evento processado: ${eventId}`);
      }
      // Futuros topics: else if (event.topic === 'orders_v2') { ... }
    } catch (error: any) {
      console.error(`[MercadoLivreWebhookWorker] erro ao processar evento: ${eventId} — ${error.message}`);
    }
  }

  private async resolveAccount(event: { payload: string | null }) {
    try {
      if (event.payload) {
        const parsed = JSON.parse(event.payload);
        const mlUserId = parsed?.user_id ? String(parsed.user_id) : null;
        if (mlUserId) {
          const acc = await prisma.mercadoLivreAccount.findFirst({ where: { mlUserId, isActive: true } });
          if (acc) return acc;
        }
      }
    } catch {
      // payload ilegivel: usa fallback seguro
    }
    return prisma.mercadoLivreAccount.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    });
  }
}

export const mercadoLivreWebhookWorker = new MercadoLivreWebhookWorker();
