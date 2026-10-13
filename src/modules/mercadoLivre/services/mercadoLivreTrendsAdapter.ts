/**
 * Read-only adapter for the official Mercado Livre trends endpoint.
 * It stores only keywords actually returned by the provider; no sales volume is inferred.
 */
export interface MercadoLivreTrend {
  keyword: string;
  source: 'MERCADOLIVRE_OFFICIAL_TRENDS_API';
  sourceUrl: string | null;
  categoryId: string | null;
  rank: number;
  observedAt: string;
  rawData: string;
}

export interface MercadoLivreTrendsResult {
  source: 'MERCADOLIVRE_OFFICIAL_TRENDS_API';
  endpoint: string;
  categoryId: string | null;
  collectedAt: string;
  trends: MercadoLivreTrend[];
  warnings: string[];
}

function safeCategoryId(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || !/^MLB\d{1,12}$/.test(value)) {
    throw new Error('INVALID_MERCADOLIVRE_CATEGORY_ID');
  }
  return value;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function trendKeyword(value: unknown): string | null {
  if (typeof value === 'string') {
    const normalized = value.trim().replace(/\s+/g, ' ');
    return normalized.length >= 2 && normalized.length <= 300 ? normalized : null;
  }
  const record = asRecord(value);
  if (!record) return null;
  for (const key of ['keyword', 'query', 'name', 'title', 'term']) {
    const candidate = record[key];
    if (typeof candidate === 'string') {
      const normalized = candidate.trim().replace(/\s+/g, ' ');
      if (normalized.length >= 2 && normalized.length <= 300) return normalized;
    }
  }
  return null;
}

function safeSourceUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 2000) return null;
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

export async function fetchMercadoLivreTrends(categoryInput: unknown, accessToken: string): Promise<MercadoLivreTrendsResult> {
  const categoryId = safeCategoryId(categoryInput);
  const token = typeof accessToken === 'string' ? accessToken.trim() : '';
  if (!token || token.length > 4096 || /[\r\n]/.test(token)) {
    throw new Error('MERCADO_LIVRE_AUTH_REQUIRED');
  }
  const endpoint = categoryId
    ? `https://api.mercadolibre.com/trends/MLB/${categoryId}`
    : 'https://api.mercadolibre.com/trends/MLB';
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: { accept: 'application/json', authorization: `Bearer ${token}`, 'user-agent': 'Sale-IA-V2-TrendsResearch/1.0' },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    const code = response.status === 429 ? 'MERCADOLIVRE_TRENDS_RATE_LIMITED' : 'MERCADOLIVRE_TRENDS_UNAVAILABLE';
    const error = new Error(code);
    Object.assign(error, { status: response.status === 429 ? 429 : 502, providerStatus: response.status });
    throw error;
  }

  const payload: unknown = await response.json();
  let items: unknown[] = [];
  if (Array.isArray(payload)) {
    items = payload;
  } else {
    const record = asRecord(payload);
    if (record && Array.isArray(record.trends)) items = record.trends;
    else if (record && Array.isArray(record.results)) items = record.results;
  }

  if (!items.length) {
    return {
      source: 'MERCADOLIVRE_OFFICIAL_TRENDS_API',
      endpoint,
      categoryId,
      collectedAt: new Date().toISOString(),
      trends: [],
      warnings: ['A API respondeu sem tendências reconhecíveis; nenhuma tendência foi inventada.'],
    };
  }

  const collectedAt = new Date().toISOString();
  const seen = new Set<string>();
  const warnings: string[] = [];
  const trends: MercadoLivreTrend[] = [];

  for (const item of items.slice(0, 100)) {
    const keyword = trendKeyword(item);
    if (!keyword) {
      warnings.push('Um registro da fonte foi ignorado por não conter palavra-chave reconhecível.');
      continue;
    }
    const key = keyword.toLocaleLowerCase('pt-BR');
    if (seen.has(key)) continue;
    seen.add(key);
    const record = asRecord(item);
    const sourceUrl = record
      ? safeSourceUrl(record.url ?? record.permalink ?? record.link)
      : null;
    trends.push({
      keyword,
      source: 'MERCADOLIVRE_OFFICIAL_TRENDS_API',
      sourceUrl,
      categoryId,
      rank: trends.length + 1,
      observedAt: collectedAt,
      rawData: JSON.stringify(item).slice(0, 5000),
    });
  }

  return {
    source: 'MERCADOLIVRE_OFFICIAL_TRENDS_API',
    endpoint,
    categoryId,
    collectedAt,
    trends,
    warnings: [...new Set(warnings)],
  };
}
