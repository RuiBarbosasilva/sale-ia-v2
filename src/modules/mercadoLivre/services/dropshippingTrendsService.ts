import { prisma } from '../lib/prisma';
import { tokenService } from '../auth/tokenService';
import { fetchMercadoLivreTrends } from './mercadoLivreTrendsAdapter';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const RETRY_MS = 6 * 60 * 60 * 1000;

function safeErrorCode(error: unknown): string {
  if (error instanceof Error && /^[A-Z0-9_]{3,100}$/.test(error.message)) return error.message;
  return 'MERCADOLIVRE_TRENDS_COLLECTION_FAILED';
}

export async function collectMercadoLivreTrends(categoryId?: string | null): Promise<{
  runId: string;
  status: 'COMPLETED';
  siteId: string;
  categoryId: string | null;
  count: number;
  collectedAt: string;
}> {
  const account = await prisma.mercadoLivreAccount.findFirst({
    where: { isActive: true },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, siteId: true },
  });
  if (!account) throw new Error('MERCADOLIVRE_ACCOUNT_NOT_CONNECTED');

  const siteId = account.siteId || 'MLB';
  const run = await prisma.dropshippingTrendRun.create({
    data: {
      siteId,
      categoryId: categoryId || null,
      status: 'RUNNING',
      source: 'MERCADOLIVRE_OFFICIAL_TRENDS_API',
    },
    select: { id: true },
  });

  try {
    const token = await tokenService.getValidToken(account.id);
    const result = await fetchMercadoLivreTrends(token, siteId, categoryId);
    const collectedAt = new Date(result.collectedAt);

    await prisma.$transaction(async (tx) => {
      if (result.trends.length) {
        await tx.dropshippingTrendSnapshot.createMany({
          data: result.trends.map((trend) => ({
            runId: run.id,
            keyword: trend.keyword,
            url: trend.url,
            position: trend.position,
            trendGroup: trend.trendGroup,
            observedAt: collectedAt,
          })),
        });
      }
      await tx.dropshippingTrendRun.update({
        where: { id: run.id },
        data: {
          status: 'COMPLETED',
          resultCount: result.trends.length,
          collectedAt,
          errorCode: null,
        },
      });
    });

    return {
      runId: run.id,
      status: 'COMPLETED',
      siteId: result.siteId,
      categoryId: result.categoryId,
      count: result.trends.length,
      collectedAt: result.collectedAt,
    };
  } catch (error) {
    await prisma.dropshippingTrendRun.update({
      where: { id: run.id },
      data: {
        status: 'FAILED',
        collectedAt: new Date(),
        errorCode: safeErrorCode(error),
      },
    }).catch(() => undefined);
    throw error;
  }
}

export async function collectMercadoLivreTrendsIfDue(categoryId?: string | null, now = new Date()): Promise<boolean> {
  const account = await prisma.mercadoLivreAccount.findFirst({
    where: { isActive: true },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, siteId: true },
  });
  if (!account) return false;

  const siteId = account.siteId || 'MLB';
  const lastRun = await prisma.dropshippingTrendRun.findFirst({
    where: { siteId, categoryId: categoryId || null },
    orderBy: { createdAt: 'desc' },
    select: { status: true, createdAt: true },
  });
  if (lastRun) {
    const age = now.getTime() - lastRun.createdAt.getTime();
    const threshold = lastRun.status === 'FAILED' ? RETRY_MS
      : lastRun.status === 'RUNNING' ? 30 * 60 * 1000
        : WEEK_MS;
    if (age < threshold) return false;
    if (lastRun.status === 'RUNNING') {
      await prisma.dropshippingTrendRun.updateMany({
        where: {
          siteId,
          categoryId: categoryId || null,
          status: 'RUNNING',
          createdAt: { lte: new Date(now.getTime() - 30 * 60 * 1000) },
        },
        data: { status: 'FAILED', errorCode: 'STALE_TREND_RUN_RECOVERED' },
      });
    }
  }

  await collectMercadoLivreTrends(categoryId);
  return true;
}

export async function listMercadoLivreTrendHistory(input: {
  categoryId?: string | null;
  limit?: number;
} = {}) {
  const limit = Number.isInteger(input.limit) ? Math.max(1, Math.min(input.limit as number, 100)) : 30;
  const where = input.categoryId
    ? { categoryId: input.categoryId }
    : {};
  return prisma.dropshippingTrendRun.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      snapshots: { orderBy: { position: 'asc' } },
    },
  });
}

export async function compareLatestMercadoLivreTrendRuns(categoryId?: string | null) {
  const runs = await prisma.dropshippingTrendRun.findMany({
    where: {
      siteId: 'MLB',
      categoryId: categoryId || null,
      status: 'COMPLETED',
    },
    orderBy: [{ collectedAt: 'desc' }, { createdAt: 'desc' }],
    take: 2,
    include: { snapshots: { orderBy: { position: 'asc' } } },
  });

  if (runs.length < 2) {
    return {
      available: false,
      message: 'São necessárias duas coletas concluídas para calcular a variação.',
      currentRunId: runs[0]?.id ?? null,
      previousRunId: null,
      changes: [],
    };
  }

  const [current, previous] = runs;
  const priorByKeyword = new Map(previous.snapshots.map((item) => [item.keyword.toLocaleLowerCase('pt-BR'), item]));
  const currentByKeyword = new Map(current.snapshots.map((item) => [item.keyword.toLocaleLowerCase('pt-BR'), item]));
  const changes = current.snapshots.map((item) => {
    const old = priorByKeyword.get(item.keyword.toLocaleLowerCase('pt-BR'));
    if (!old) {
      return {
        keyword: item.keyword,
        currentPosition: item.position,
        previousPosition: null,
        positionDelta: null,
        movement: 'NEW' as const,
        trendGroup: item.trendGroup,
      };
    }
    const delta = old.position - item.position;
    return {
      keyword: item.keyword,
      currentPosition: item.position,
      previousPosition: old.position,
      positionDelta: delta,
      movement: delta > 0 ? 'IMPROVED' as const : delta < 0 ? 'DECLINED' as const : 'STABLE' as const,
      trendGroup: item.trendGroup,
    };
  });
  for (const old of previous.snapshots) {
    if (!currentByKeyword.has(old.keyword.toLocaleLowerCase('pt-BR'))) {
      changes.push({
        keyword: old.keyword,
        currentPosition: null,
        previousPosition: old.position,
        positionDelta: null,
        movement: 'DISAPPEARED' as const,
        trendGroup: old.trendGroup,
      });
    }
  }

  return {
    available: true,
    currentRunId: current.id,
    previousRunId: previous.id,
    currentCollectedAt: current.collectedAt,
    previousCollectedAt: previous.collectedAt,
    changes: changes.sort((left, right) => {
      const rank = (movement: string) => movement === 'NEW' ? 0 : movement === 'IMPROVED' ? 1 :
        movement === 'STABLE' ? 2 : movement === 'DECLINED' ? 3 : 4;
      return rank(left.movement) - rank(right.movement) ||
        (left.currentPosition ?? 999) - (right.currentPosition ?? 999);
    }),
  };
}
