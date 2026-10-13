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

    const result = await fetchMercadoLivreTrends(undefined, 'test-access-token');

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.mercadolibre.com/trends/MLB',
      expect.objectContaining({ method: 'GET', headers: expect.objectContaining({ authorization: 'Bearer test-access-token' }) })
    );
    expect(result.trends).toHaveLength(2);
    expect(result.trends[0].keyword).toBe('organizador de cabos');
    expect(result.trends[0].rank).toBe(1);
    expect(result.trends[0].sourceUrl).toBe('https://www.mercadolivre.com.br/organizador');
    expect(result.trends[1].rank).toBe(2);
    expect(result.warnings).toHaveLength(1);
    expect(result.trends[0]).not.toHaveProperty('sales');
  });

  it('uses the validated category endpoint and accepts the documented trends envelope', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ trends: [{ query: '  suporte   articulado ' }] }),
    } as Response);

    const result = await fetchMercadoLivreTrends('MLB1051', 'test-access-token');

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.mercadolibre.com/trends/MLB/MLB1051',
      expect.objectContaining({ method: 'GET' })
    );
    expect(result.categoryId).toBe('MLB1051');
    expect(result.trends.map((trend) => trend.keyword)).toEqual(['suporte articulado']);
  });

  it('returns an explicit warning when the provider payload has no recognized trend list', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ items: [{ keyword: 'não usar como tendência' }] }),
    } as Response);

    const result = await fetchMercadoLivreTrends(undefined, 'test-access-token');

    expect(result.trends).toEqual([]);
    expect(result.warnings).toContain(
      'A API respondeu sem tendências reconhecíveis; nenhuma tendência foi inventada.'
    );
  });

  it('normalizes non-rate-limit provider errors to a gateway error', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({}),
    } as Response);

    await expect(fetchMercadoLivreTrends(undefined, 'test-access-token')).rejects.toMatchObject({
      message: 'MERCADOLIVRE_TRENDS_UNAVAILABLE',
      status: 502,
      providerStatus: 503,
    });
  });

  it('requires an OAuth access token before making a network request', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch');
    await expect(fetchMercadoLivreTrends(undefined, '')).rejects.toThrow('MERCADO_LIVRE_AUTH_REQUIRED');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('rejects access tokens containing line breaks before making a network request', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch');
    await expect(fetchMercadoLivreTrends(undefined, 'token\nforged')).rejects.toThrow('MERCADO_LIVRE_AUTH_REQUIRED');
    await expect(fetchMercadoLivreTrends(undefined, 'token\rforged')).rejects.toThrow('MERCADO_LIVRE_AUTH_REQUIRED');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('rejects malformed category IDs before making a network request', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch');
    await expect(fetchMercadoLivreTrends('../bad', 'test-access-token')).rejects.toThrow('INVALID_MERCADOLIVRE_CATEGORY_ID');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('reports provider rate limiting instead of returning fake trends', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({}),
    } as Response);

    await expect(fetchMercadoLivreTrends(undefined, 'test-access-token')).rejects.toThrow('MERCADOLIVRE_TRENDS_RATE_LIMITED');
  });
});
