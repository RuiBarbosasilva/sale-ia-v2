import { Request, Response } from 'express';
import { collectMercadoLivreTrends, listMercadoLivreTrendHistory } from '../services/dropshippingTrendsService';

function normalizedCategoryId(value: unknown): string | null | undefined {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || !/^MLB[0-9]{1,12}$/.test(value)) return undefined;
  return value;
}

function errorStatus(error: unknown): number {
  if (error && typeof error === 'object' && 'status' in error &&
      typeof (error as { status?: unknown }).status === 'number') {
    return (error as { status: number }).status;
  }
  if (error instanceof Error && [
    'MERCADOLIVRE_ACCOUNT_NOT_CONNECTED',
    'MERCADO_LIVRE_AUTH_REQUIRED',
    'MERCADO_LIVRE_OAUTH_NOT_CONFIGURED',
    'MERCADOLIVRE_TRENDS_TOKEN_REQUIRED',
  ].includes(error.message)) return 503;
  return 502;
}

export async function collectDropshippingTrends(req: Request, res: Response): Promise<Response> {
  const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body)
    ? req.body as Record<string, unknown>
    : {};
  const categoryId = normalizedCategoryId(body.categoryId);
  if (categoryId === undefined) return res.status(400).json({ error: 'INVALID_TRENDS_CATEGORY_ID' });

  try {
    const result = await collectMercadoLivreTrends(categoryId);
    return res.status(200).json({ success: true, result });
  } catch (error) {
    const code = error instanceof Error && /^[A-Z0-9_]{3,100}$/.test(error.message)
      ? error.message
      : 'MERCADOLIVRE_TRENDS_COLLECTION_FAILED';
    return res.status(errorStatus(error)).json({ success: false, error: code });
  }
}

export async function getDropshippingTrendsHistory(req: Request, res: Response): Promise<Response> {
  const categoryId = normalizedCategoryId(req.query.categoryId);
  if (categoryId === undefined) return res.status(400).json({ error: 'INVALID_TRENDS_CATEGORY_ID' });
  const rawLimit = req.query.limit;
  const limit = rawLimit === undefined ? 30 : Number(rawLimit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    return res.status(400).json({ error: 'INVALID_TRENDS_HISTORY_LIMIT', allowed: '1-100' });
  }

  try {
    const runs = await listMercadoLivreTrendHistory({ categoryId, limit });
    return res.json({ success: true, count: runs.length, runs });
  } catch {
    return res.status(500).json({ success: false, error: 'MERCADOLIVRE_TRENDS_HISTORY_FAILED' });
  }
}
