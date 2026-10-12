import { searchMercadoLivreCatalog } from '../mercadoLivreResearchAdapter';

describe('Mercado Livre official catalog research adapter', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  test('validates query before making a network request', async () => {
    const mock = jest.fn();
    global.fetch = mock as unknown as typeof fetch;
    await expect(searchMercadoLivreCatalog(' ')).rejects.toThrow('INVALID_RESEARCH_QUERY');
    expect(mock).not.toHaveBeenCalled();
  });

  test('validates bounded result count', async () => {
    const mock = jest.fn();
    global.fetch = mock as unknown as typeof fetch;
    await expect(searchMercadoLivreCatalog('organizador', 1000)).rejects.toThrow('INVALID_RESEARCH_LIMIT');
    expect(mock).not.toHaveBeenCalled();
  });

  test('maps official API results and preserves missing sales as unknown', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        paging: { total: 1 },
        results: [{
          id: 'MLB1234567890', title: 'Organizador de cabos', price: 49.9,
          currency_id: 'BRL', available_quantity: 8,
          permalink: 'https://produto.mercadolivre.com.br/MLB-1234567890',
          shipping: { free_shipping: true }, seller: { id: 123 },
        }],
      }),
    }) as unknown as typeof fetch;
    const result = await searchMercadoLivreCatalog('organizador de cabos', '1');
    expect(result.source).toBe('MERCADOLIVRE_OFFICIAL_PUBLIC_API');
    expect(result.totalResults).toBe(1);
    expect(result.results[0].price).toBe(49.9);
    expect(result.results[0].availableQuantity).toBe(8);
    expect(result.results[0].soldQuantity).toBeNull();
    expect(result.results[0].warnings).toContain('Vendas não informadas pela fonte');
  });

  test('maps rate limits to a retryable error code', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 429 }) as unknown as typeof fetch;
    await expect(searchMercadoLivreCatalog('organizador')).rejects.toThrow('MARKETPLACE_RATE_LIMITED');
  });
});
