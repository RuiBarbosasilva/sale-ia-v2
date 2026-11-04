import { fetchMercadoLivreTrends } from '../mercadoLivreTrendsAdapter';

describe('Mercado Livre Trends API adapter', () => {
  afterEach(() => jest.restoreAllMocks());

  test('uses OAuth and classifies the 50 ranked keywords into documented groups', async () => {
    const payload = Array.from({ length: 50 }, (_, index) => ({
      keyword: `termo ${index + 1}`,
      url: 'https://lista.mercadolivre.com.br/termo',
    }));
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => payload,
    } as Response);

    const result = await fetchMercadoLivreTrends('access-token-valid-123', 'MLB');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(String(url)).toBe('https://api.mercadolibre.com/trends/MLB');
    expect((options?.headers as Record<string, string>).Authorization).toBe('Bearer access-token-valid-123');
    expect(result.trends).toHaveLength(50);
    expect(result.trends[0]).toMatchObject({ position: 1, trendGroup: 'FASTEST_GROWING' });
    expect(result.trends[9].trendGroup).toBe('FASTEST_GROWING');
    expect(result.trends[10].trendGroup).toBe('MOST_WANTED');
    expect(result.trends[29].trendGroup).toBe('MOST_WANTED');
    expect(result.trends[30].trendGroup).toBe('POPULAR');
    expect(result.trends[49].position).toBe(50);
  });

  test('supports category trends and rejects malformed category IDs before network access', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [{ keyword: 'camisa', url: 'https://lista.mercadolivre.com.br/camisa' }],
    } as Response);

    await expect(fetchMercadoLivreTrends('access-token-valid-123', 'MLB', 'bad-id'))
      .rejects.toThrow('INVALID_TRENDS_CATEGORY_ID');
    expect(fetchMock).not.toHaveBeenCalled();

    const result = await fetchMercadoLivreTrends('access-token-valid-123', 'MLB', 'MLB1430');
    expect(String(fetchMock.mock.calls[0][0])).toBe('https://api.mercadolibre.com/trends/MLB/MLB1430');
    expect(result.categoryId).toBe('MLB1430');
  });

  test('drops malformed entries and never trusts non-HTTPS or off-domain URLs', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [
        { keyword: '  termo válido  ', url: 'https://lista.mercadolivre.com.br/termo' },
        { keyword: 'site falso', url: 'https://example.com/phishing' },
        { keyword: 'sem URL', url: 'http://lista.mercadolivre.com.br/termo' },
        { url: 'https://lista.mercadolivre.com.br/sem-chave' },
      ],
    } as Response);

    const result = await fetchMercadoLivreTrends('access-token-valid-123');
    expect(result.trends).toHaveLength(3);
    expect(result.trends[0]).toMatchObject({ keyword: 'termo válido', url: 'https://lista.mercadolivre.com.br/termo' });
    expect(result.trends[1].url).toBeNull();
    expect(result.trends[2].url).toBeNull();
  });

  test('maps authorization failures to a safe error code', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({}),
    } as Response);

    await expect(fetchMercadoLivreTrends('access-token-valid-123'))
      .rejects.toThrow('MERCADOLIVRE_TRENDS_AUTHORIZATION_FAILED');
  });
});
