/**
 * Read-only Mercado Livre Brazil catalog research through the official public API.
 * This adapter reports observed listings; listing counts are not sales forecasts.
 */
export interface MercadoLivreSearchItem {
  id: string;
  title: string;
  price: number;
  currency_id?: string;
  available_quantity?: number;
  sold_quantity?: number;
  condition?: string;
  permalink: string;
  category_id?: string;
  shipping?: { free_shipping?: boolean };
  seller?: { id?: number };
  thumbnail?: string;
}

export interface MercadoLivreSearchResult {
  source: 'MERCADOLIVRE_OFFICIAL_PUBLIC_API';
  query: string;
  collectedAt: string;
  totalResults: number;
  results: Array<{
    id: string;
    title: string;
    price: number;
    currency: string;
    availableQuantity: number | null;
    soldQuantity: number | null;
    condition: string | null;
    url: string;
    categoryId: string | null;
    freeShipping: boolean | null;
    sellerId: number | null;
    evidenceConfidencePct: number;
    warnings: string[];
  }>;
}

function validateQuery(query: unknown): string {
  if (typeof query !== 'string') throw new Error('INVALID_RESEARCH_QUERY');
  const normalized = query.trim().replace(/\s+/g, ' ');
  if (normalized.length < 2 || normalized.length > 120) throw new Error('INVALID_RESEARCH_QUERY');
  if (/[\u0000-\u001f<>]/.test(normalized)) throw new Error('INVALID_RESEARCH_QUERY');
  return normalized;
}

function boundedLimit(value: unknown): number {
  if (value === undefined) return 20;
  const parsed = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
  if (typeof parsed !== 'number' || !Number.isInteger(parsed) || parsed < 1 || parsed > 50) {
    throw new Error('INVALID_RESEARCH_LIMIT');
  }
  return parsed;
}

export async function searchMercadoLivreCatalog(queryInput: unknown, limitInput?: unknown): Promise<MercadoLivreSearchResult> {
  const query = validateQuery(queryInput);
  const limit = boundedLimit(limitInput);
  const url = new URL('https://api.mercadolibre.com/sites/MLB/search');
  url.searchParams.set('q', query);
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('sort', 'relevance');

  const response = await fetch(url, {
    method: 'GET',
    headers: { accept: 'application/json', 'user-agent': 'Sale-IA-V2-DropshippingResearch/1.0' },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) {
    const error = new Error(response.status === 429 ? 'MARKETPLACE_RATE_LIMITED' : 'MARKETPLACE_RESEARCH_UNAVAILABLE');
    Object.assign(error, { status: response.status === 429 ? 429 : 502 });
    throw error;
  }

  const data: unknown = await response.json();
  if (!data || typeof data !== 'object' || !Array.isArray((data as { results?: unknown }).results)) {
    throw new Error('MARKETPLACE_INVALID_RESPONSE');
  }
  const record = data as { paging?: { total?: number }; results: MercadoLivreSearchItem[] };
  const collectedAt = new Date().toISOString();
  const results = record.results.map((item) => {
    const warnings: string[] = [];
    const validPrice = typeof item.price === 'number' && Number.isFinite(item.price) && item.price > 0;
    if (!validPrice) warnings.push('Preço inválido ou ausente');
    if (typeof item.sold_quantity !== 'number') warnings.push('Vendas não informadas pela fonte');
    if (typeof item.available_quantity !== 'number') warnings.push('Estoque não informado pela fonte');
    return {
      id: String(item.id || ''),
      title: String(item.title || ''),
      price: validPrice ? item.price : 0,
      currency: String(item.currency_id || 'BRL'),
      availableQuantity: typeof item.available_quantity === 'number' ? item.available_quantity : null,
      soldQuantity: typeof item.sold_quantity === 'number' ? item.sold_quantity : null,
      condition: item.condition ? String(item.condition) : null,
      url: typeof item.permalink === 'string' ? item.permalink : '',
      categoryId: item.category_id ? String(item.category_id) : null,
      freeShipping: typeof item.shipping?.free_shipping === 'boolean' ? item.shipping.free_shipping : null,
      sellerId: typeof item.seller?.id === 'number' ? item.seller.id : null,
      evidenceConfidencePct: validPrice && Boolean(item.id && item.permalink) ? 90 : 40,
      warnings,
    };
  }).filter((item) => item.id && item.title && item.url);

  return {
    source: 'MERCADOLIVRE_OFFICIAL_PUBLIC_API',
    query,
    collectedAt,
    totalResults: typeof record.paging?.total === 'number' ? record.paging.total : results.length,
    results,
  };
}
