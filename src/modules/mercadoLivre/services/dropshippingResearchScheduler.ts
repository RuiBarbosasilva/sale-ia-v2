import { prisma } from '../lib/prisma';
import { searchMercadoLivreCatalog } from './mercadoLivreResearchAdapter';

let timer: ReturnType<typeof setInterval> | null = null;
let running = false;
let lastStaleOfferScanAt = 0;

async function upsertAlert(input: {
  type: string;
  title: string;
  severity: string;
  message: string;
  payload: string;
}): Promise<void> {
  try {
    const existing = await prisma.dropshippingAlert.findFirst({
      where: { type: input.type, title: input.title, status: 'OPEN' },
      select: { id: true },
    });
    if (existing) {
      await prisma.dropshippingAlert.update({ where: { id: existing.id }, data: input });
    } else {
      await prisma.dropshippingAlert.create({ data: input });
    }
  } catch {
    // A falha de um alerta não invalida a captura do catálogo já persistida.
  }
}

async function collectWatch(query: string): Promise<void> {
  const watch = await prisma.dropshippingResearchWatch.findUnique({ where: { query } });
  if (!watch || !watch.enabled) return;
  const startedAt = new Date();
  await prisma.dropshippingResearchWatch.update({
    where: { id: watch.id },
    data: {
      lastStatus: 'RUNNING',
      lastRunAt: startedAt,
      nextRunAt: new Date(startedAt.getTime() + watch.intervalMinutes * 60_000),
      lastError: null,
    },
  });

  try {
    const result = await searchMercadoLivreCatalog(watch.query, 20);
    const previousSnapshots = await Promise.all(result.results.map(async (item) => ({
      item,
      previous: await prisma.dropshippingCatalogSnapshot.findFirst({
        where: { itemId: item.id },
        orderBy: { observedAt: 'desc' },
        select: { price: true, availableQuantity: true },
      }),
    })));

    const run = await prisma.dropshippingResearchRun.create({
      data: {
        query: result.query,
        source: result.source,
        status: 'COMPLETED',
        totalResults: result.totalResults,
        resultCount: result.results.length,
        collectedAt: new Date(result.collectedAt),
        resultSummary: JSON.stringify({
          warnings: result.results.reduce((sum, item) => sum + item.warnings.length, 0),
          scheduledWatchId: watch.id,
        }),
        snapshots: {
          create: result.results.map((item) => ({
            itemId: item.id,
            title: item.title,
            price: item.price,
            currency: item.currency,
            availableQuantity: item.availableQuantity,
            soldQuantity: item.soldQuantity,
            condition: item.condition,
            url: item.url,
            categoryId: item.categoryId,
            freeShipping: item.freeShipping,
            sellerId: item.sellerId,
            evidenceConfidencePct: item.evidenceConfidencePct,
            warnings: JSON.stringify(item.warnings),
            observedAt: new Date(result.collectedAt),
          })),
        },
      },
      select: { id: true },
    });

    for (const { item, previous } of previousSnapshots) {
      if (!previous) continue;
      const changePct = previous.price > 0 ? ((item.price - previous.price) / previous.price) * 100 : 0;
      if (Math.abs(changePct) >= 10) {
        const rounded = Number(changePct.toFixed(2));
        await upsertAlert({
          type: 'PRICE_MOVEMENT',
          title: 'Mudança de preço observada: ' + item.id,
          severity: Math.abs(changePct) >= 25 ? 'WARNING' : 'INFO',
          message: 'Preço mudou de R$ ' + previous.price.toFixed(2) + ' para R$ ' +
            item.price.toFixed(2) + ' (' + rounded + '%).',
          payload: JSON.stringify({ itemId: item.id, previousPrice: previous.price, currentPrice: item.price, changePct: rounded, runId: run.id, url: item.url }),
        });
      }
      if (previous.availableQuantity !== null && previous.availableQuantity > 0 && item.availableQuantity === 0) {
        await upsertAlert({
          type: 'STOCK_RISK',
          title: 'Estoque zerado observado: ' + item.id,
          severity: 'WARNING',
          message: 'A coleta agendada detectou estoque zerado no anúncio.',
          payload: JSON.stringify({ itemId: item.id, previousStock: previous.availableQuantity, currentStock: 0, runId: run.id, url: item.url }),
        });
      }
    }

    await prisma.dropshippingResearchWatch.update({
      where: { id: watch.id },
      data: { lastStatus: 'COMPLETED', lastError: null },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'DROPSHIPPING_WATCH_FAILED';
    await prisma.dropshippingResearchWatch.update({
      where: { id: watch.id },
      data: {
        lastStatus: 'FAILED',
        lastError: message.slice(0, 500),
        nextRunAt: new Date(Date.now() + watch.intervalMinutes * 60_000),
      },
    }).catch(() => undefined);
  }
}


async function scanStaleSupplierOffers(): Promise<void> {
  if (Date.now() - lastStaleOfferScanAt < 15 * 60_000) return;
  try {
    const cutoff = new Date(Date.now() - 24 * 60 * 60_000);
    const staleOffers = await prisma.dropshippingSupplierOffer.findMany({
      where: {
        status: 'ACTIVE',
        OR: [{ stockObservedAt: null }, { stockObservedAt: { lt: cutoff } }],
      },
      take: 100,
      orderBy: { createdAt: 'asc' },
      select: {
        id: true, productCandidateId: true, supplierCandidateId: true,
        supplierUrl: true, stockObservedAt: true, availableQuantity: true,
        productCandidate: { select: { title: true } },
        supplierCandidate: { select: { name: true } },
      },
    });
    for (const offer of staleOffers) {
      const title = 'Estoque de fornecedor desatualizado: ' +
        offer.productCandidate.title + ' / ' + offer.supplierCandidate.name;
      const message = offer.stockObservedAt
        ? 'Última observação de estoque ocorreu em ' + offer.stockObservedAt.toISOString() + '; confirme estoque e preço antes de vender.'
        : 'A oferta não tem observação de estoque registrada; confirme estoque e preço antes de vender.';
      await upsertAlert({
        type: 'SUPPLIER_OFFER_STALE',
        title,
        severity: 'WARNING',
        message,
        payload: JSON.stringify({
          offerId: offer.id,
          productCandidateId: offer.productCandidateId,
          supplierCandidateId: offer.supplierCandidateId,
          availableQuantity: offer.availableQuantity,
          stockObservedAt: offer.stockObservedAt,
          supplierUrl: offer.supplierUrl,
        }),
      });
    }
    lastStaleOfferScanAt = Date.now();
  } catch {
    // A falha na varredura de ofertas não deve interromper pesquisas de catálogo.
  }
}

export async function runDueDropshippingResearchWatches(): Promise<void> {
  if (running) return;
  running = true;
  try {
    const now = new Date();
    const due = await prisma.dropshippingResearchWatch.findMany({
      where: {
        enabled: true,
        OR: [{ nextRunAt: null }, { nextRunAt: { lte: now } }],
      },
      orderBy: [{ nextRunAt: 'asc' }, { updatedAt: 'asc' }],
      take: 3,
      select: { query: true },
    });
    for (const watch of due) await collectWatch(watch.query);
    await scanStaleSupplierOffers();
  } finally {
    running = false;
  }
}

export function startDropshippingResearchScheduler(intervalMs = 60_000): void {
  if (timer || process.env.NODE_ENV === 'test') return;
  const safeInterval = Number.isFinite(intervalMs) ? Math.max(15_000, Math.min(intervalMs, 300_000)) : 60_000;
  void runDueDropshippingResearchWatches().catch(() => undefined);
  timer = setInterval(() => { void runDueDropshippingResearchWatches().catch(() => undefined); }, safeInterval);
  if (typeof timer === 'object' && 'unref' in timer && typeof timer.unref === 'function') timer.unref();
}

export function stopDropshippingResearchScheduler(): void {
  if (timer) clearInterval(timer);
  timer = null;
}
