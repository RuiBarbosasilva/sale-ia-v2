import { sendWordPressDraft } from '../src/modules/blogFactory/wordpressPublisher';

describe('WordPress publisher', () => {
  const oldUrl = process.env.BLOG_FACTORY_WORDPRESS_URL;
  const oldUser = process.env.BLOG_FACTORY_WORDPRESS_USERNAME;
  const oldPassword = process.env.BLOG_FACTORY_WORDPRESS_APP_PASSWORD;

  beforeEach(() => {
    process.env.BLOG_FACTORY_WORDPRESS_URL = 'https://example.test';
    process.env.BLOG_FACTORY_WORDPRESS_USERNAME = 'editor';
    process.env.BLOG_FACTORY_WORDPRESS_APP_PASSWORD = 'test-app-password';
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (oldUrl === undefined) delete process.env.BLOG_FACTORY_WORDPRESS_URL; else process.env.BLOG_FACTORY_WORDPRESS_URL = oldUrl;
    if (oldUser === undefined) delete process.env.BLOG_FACTORY_WORDPRESS_USERNAME; else process.env.BLOG_FACTORY_WORDPRESS_USERNAME = oldUser;
    if (oldPassword === undefined) delete process.env.BLOG_FACTORY_WORDPRESS_APP_PASSWORD; else process.env.BLOG_FACTORY_WORDPRESS_APP_PASSWORD = oldPassword;
  });

  it('reuses an existing post with the same slug instead of creating a duplicate', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [{ id: 42, link: 'https://example.test/?p=42', status: 'draft' }]
    } as Response);

    const result = await sendWordPressDraft({ title: 'Article', slug: 'same-slug', excerpt: '', body: '<p>Text</p>' });

    expect(result.id).toBe(42);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('slug=same-slug');
  });

  it('refuses to reuse an existing published post with the same slug', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [{ id: 44, link: 'https://example.test/published', status: 'publish' }]
    } as Response);

    await expect(sendWordPressDraft({ title: 'Article', slug: 'published-slug', excerpt: '', body: '<p>Text</p>' }))
      .rejects.toThrow('WORDPRESS_SLUG_ALREADY_USED');
  });

  it('creates a WordPress draft when the slug does not exist', async () => {
    const fetchMock = jest.spyOn(global, 'fetch')
      .mockResolvedValueOnce({ ok: true, json: async () => [] } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 43, link: 'https://example.test/?p=43', status: 'draft' }) } as Response);

    const result = await sendWordPressDraft({ title: 'Article', slug: 'new-slug', excerpt: '', body: '<p>Text</p>' });

    expect(result.id).toBe(43);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect((fetchMock.mock.calls[1][1] as RequestInit).method).toBe('POST');
    expect(JSON.parse(String((fetchMock.mock.calls[1][1] as RequestInit).body)).status).toBe('draft');
  });
  it('rejects insecure external HTTP URLs before sending credentials', async () => {
    process.env.BLOG_FACTORY_WORDPRESS_URL = 'http://wordpress.example.test';
    const fetchMock = jest.spyOn(global, 'fetch');
    await expect(sendWordPressDraft({ title: 'Article', slug: 'insecure', excerpt: '', body: '<p>Text</p>' }))
      .rejects.toThrow('WORDPRESS_INVALID_URL');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects credentials embedded in the WordPress URL', async () => {
    process.env.BLOG_FACTORY_WORDPRESS_URL = 'https://editor:secret@example.test';
    const fetchMock = jest.spyOn(global, 'fetch');
    await expect(sendWordPressDraft({ title: 'Article', slug: 'embedded-credentials', excerpt: '', body: '<p>Text</p>' }))
      .rejects.toThrow('WORDPRESS_INVALID_URL');
    expect(fetchMock).not.toHaveBeenCalled();
  });

});
