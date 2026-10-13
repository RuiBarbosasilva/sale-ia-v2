import { prisma } from '../lib/prisma';
import { searchMercadoLivreCatalog } from './mercadoLivreResearchAdapter';
import { fetchMercadoLivreTrends } from './mercadoLivreTrendsAdapter';

let timer: ReturnType<typeof setInterval> | null = null;
let running = false;
let lastTrendAttemptAt = 0;

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


async function collectTrendsIfDue(): Promise<void> {
  const configured = Number(process.env.DROPSHIPPING_TRENDS_INTERVAL_MS || 86_400_000);
  const intervalMs = Number.isFinite(configured)
    ? Math.max(3_600_000, Math.min(configured, 604_800_000))
    : 86_400_000;
  const nowMs = Date.now();
  if (nowMs - lastTrendAttemptAt < intervalMs) return;

  try {
    // Category-specific manual collections must not suppress the scheduled global snapshot.
    const latest = await prisma.dropshippingTrendSnapshot.findFirst({
      where: {
        source: 'MERCADOLIVRE_OFFICIAL_TRENDS_API',
        categoryId: null,
      },
      orderBy: { observedAt: 'desc' },
      select: { observedAt: true },
    });
    if (latest && nowMs - latest.observedAt.getTime() < intervalMs) {
      lastTrendAttemptAt = nowMs;
      return;
    }
  } catch {
    // The collection below will surface persistence/schema problems as an alert.
  }

  // Throttle attempts even when the provider is unavailable or changes its response.
  lastTrendAttemptAt = nowMs;
  try {
    const result = await fetchMercadoLivreTrends();
    if (!result.trends.length) {
      await upsertAlert({
        type: 'TRENDS_COLLECTION_EMPTY',
        title: 'Coleta de tendências sem palavras-chave reconhecidas',
        severity: 'WARNING',
        message: 'A fonte oficial respondeu, mas não retornou registros reconhecíveis para persistência.',
        payload: JSON.stringify({ endpoint: result.endpoint, collectedAt: result.collectedAt, warnings: result.warnings }),
      });
      return;
    }
    await prisma.$transaction(result.trends.map((trend) =>
      prisma.dropshippingTrendSnapshot.create({
        data: {
          keyword: trend.keyword,
          source: trend.source,
          sourceUrl: trend.sourceUrl,
          categoryId: trend.categoryId,
          rank: trend.rank,
          observedAt: new Date(trend.observedAt),
          rawData: trend.rawData,
        },
        select: { id: true },
      })
    ));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'MERCADOLIVRE_TRENDS_COLLECTION_FAILED';
    await upsertAlert({
      type: 'TRENDS_COLLECTION_FAILED',
      title: 'Falha na coleta de tendências do Mercado Livre',
      severity: 'WARNING',
      message: message.slice(0, 400),
      payload: JSON.stringify({ attemptedAt: new Date(nowMs).toISOString() }),
    });
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
    await collectTrendsIfDue();
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
