/**
 * Authenticated adapter for the official Mercado Livre Trends API.
 * The API returns up to 50 weekly keywords: positions 1-10 fastest growing,
 * 11-30 most wanted, and 31-50 popular trends. This is a ranking, not a
 * sales guarantee or a daily search-volume metric.
 */
export type MercadoLivreTrendGroup = 'FASTEST_GROWING' | 'MOST_WANTED' | 'POPULAR';

export interface MercadoLivreTrend {
  keyword: string;
  url: string | null;
  position: number;
  trendGroup: MercadoLivreTrendGroup;
}

export interface MercadoLivreTrendsResult {
  siteId: string;
  categoryId: string | null;
  collectedAt: string;
  source: 'MERCADOLIVRE_OFFICIAL_TRENDS_API';
  trends: MercadoLivreTrend[];
}

function validateSiteId(value: unknown): string {
  if (typeof value !== 'string' || !/^[A-Z]{3}$/.test(value)) {
    throw new Error('INVALID_TRENDS_SITE_ID');
  }
  return value;
}

function validateCategoryId(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || !/^MLB[0-9]{1,12}$/.test(value)) {
    throw new Error('INVALID_TRENDS_CATEGORY_ID');
  }
  return value;
}

function trendGroupForPosition(position: number): MercadoLivreTrendGroup {
  if (position <= 10) return 'FASTEST_GROWING';
  if (position <= 30) return 'MOST_WANTED';
  return 'POPULAR';
}

function safeTrendUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const parsed = new URL(value);
    const host = parsed.hostname.toLowerCase();
    if (parsed.protocol !== 'https:' ||
        !(host === 'mercadolivre.com.br' || host.endsWith('.mercadolivre.com.br') ||
          host === 'mercadolibre.com' || host.endsWith('.mercadolibre.com'))) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export async function fetchMercadoLivreTrends(
  accessToken: string,
  siteIdInput: unknown = 'MLB',
  categoryIdInput?: unknown,
): Promise<MercadoLivreTrendsResult> {
  if (typeof accessToken !== 'string' || accessToken.trim().length < 8 || accessToken.length > 4096) {
    throw new Error('MERCADOLIVRE_TRENDS_TOKEN_REQUIRED');
  }
  const siteId = validateSiteId(siteIdInput);
  const categoryId = validateCategoryId(categoryIdInput);
  const endpoint = new URL(`https://api.mercadolibre.com/trends/${siteId}${categoryId ? `/${categoryId}` : ''}`);

  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      'User-Agent': 'Sale-IA-V2-DropshippingTrends/1.0',
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    const code = response.status === 401 || response.status === 403
      ? 'MERCADOLIVRE_TRENDS_AUTHORIZATION_FAILED'
      : response.status === 429
        ? 'MERCADOLIVRE_TRENDS_RATE_LIMITED'
        : response.status === 404
          ? 'MERCADOLIVRE_TRENDS_RESOURCE_NOT_FOUND'
          : 'MERCADOLIVRE_TRENDS_UNAVAILABLE';
    const error = new Error(code);
    const status = response.status === 429 ? 429
      : response.status === 401 || response.status === 403 ? 503
        : response.status === 404 ? 422
          : 502;
    Object.assign(error, { status });
    throw error;
  }

  const payload: unknown = await response.json();
  if (!Array.isArray(payload)) throw new Error('MERCADOLIVRE_TRENDS_INVALID_RESPONSE');

  const trends: MercadoLivreTrend[] = [];
  payload.slice(0, 50).forEach((raw: unknown, index: number) => {
    if (!raw || typeof raw !== 'object') return;
    const item = raw as { keyword?: unknown; url?: unknown };
    if (typeof item.keyword !== 'string' || !item.keyword.trim()) return;
    const position = index + 1;
    trends.push({
      keyword: item.keyword.trim().slice(0, 300),
      url: safeTrendUrl(item.url),
      position,
      trendGroup: trendGroupForPosition(position),
    });
  });

  return {
    siteId,
    categoryId,
    collectedAt: new Date().toISOString(),
    source: 'MERCADOLIVRE_OFFICIAL_TRENDS_API',
    trends,
  };
}
