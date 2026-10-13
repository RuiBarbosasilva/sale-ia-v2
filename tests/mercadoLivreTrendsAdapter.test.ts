import { fetchMercadoLivreTrends } from '../src/modules/mercadoLivre/services/mercadoLivreTrendsAdapter';

describe('fetchMercadoLivreTrends', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('normalizes and deduplicates real provider keywords without inventing metrics', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [
        { keyword: '  organizador   de cabos ', url: 'https://www.mercadolivre.com.br/organizador' },
        { keyword: 'organizador de cabos', url: 'https://www.mercadolivre.com.br/duplicado' },
        { keyword: 'suporte para notebook' },
        { unrelated: true },
      ],
    } as Response);

    const result = await fetchMercadoLivreTrends();

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.mercadolibre.com/trends/MLB',
      expect.objectContaining({ method: 'GET' })
    );
    expect(result.trends).toHaveLength(2);
    expect(result.trends[0].keyword).toBe('organizador de cabos');
    expect(result.trends[0].rank).toBe(1);
    expect(result.trends[0].sourceUrl).toBe('https://www.mercadolivre.com.br/organizador');
    expect(result.trends[1].rank).toBe(2);
    expect(result.warnings).toHaveLength(1);
    expect(result.trends[0]).not.toHaveProperty('sales');
  });

  it('rejects malformed category IDs before making a network request', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch');
    await expect(fetchMercadoLivreTrends('../bad')).rejects.toThrow('INVALID_MERCADOLIVRE_CATEGORY_ID');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('reports provider rate limiting instead of returning fake trends', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({}),
    } as Response);

    await expect(fetchMercadoLivreTrends()).rejects.toThrow('MERCADOLIVRE_TRENDS_RATE_LIMITED');
  });
});
