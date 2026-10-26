export type CmsDraftResult = { id: number; link?: string; status?: string };

export async function sendWordPressDraft(input: { title: string; slug: string; excerpt: string; body: string }) {
  const baseUrl = process.env.BLOG_FACTORY_WORDPRESS_URL?.replace(/\/+$/, '');
  const username = process.env.BLOG_FACTORY_WORDPRESS_USERNAME;
  const appPassword = process.env.BLOG_FACTORY_WORDPRESS_APP_PASSWORD;
  if (!baseUrl || !username || !appPassword) throw new Error('WORDPRESS_NOT_CONFIGURED');

  let parsedBase: URL;
  try { parsedBase = new URL(baseUrl); } catch { throw new Error('WORDPRESS_INVALID_URL'); }
  if (!['http:', 'https:'].includes(parsedBase.protocol)) throw new Error('WORDPRESS_INVALID_URL');

  const auth = Buffer.from(username + ':' + appPassword).toString('base64');
  const headers = { authorization: 'Basic ' + auth, 'content-type': 'application/json' };

  // Idempotency guard: reuse an existing post with the same slug before attempting POST.
  const lookupUrl = baseUrl + '/wp-json/wp/v2/posts?slug=' + encodeURIComponent(input.slug) + '&status=any&context=edit';
  const lookup = await fetch(lookupUrl, {
    method: 'GET',
    headers: { authorization: 'Basic ' + auth, accept: 'application/json' },
    signal: AbortSignal.timeout(15000)
  });
  if (!lookup.ok) throw new Error('WORDPRESS_LOOKUP_HTTP_' + lookup.status);
  const matches = await lookup.json() as CmsDraftResult[];
  if (Array.isArray(matches) && matches.length > 0 && Number.isFinite(Number(matches[0].id))) {
    if (matches[0].status !== 'draft') throw new Error('WORDPRESS_SLUG_ALREADY_USED');
    return matches[0];
  }

  const response = await fetch(baseUrl + '/wp-json/wp/v2/posts', {
    method: 'POST',
    headers,
    signal: AbortSignal.timeout(30000),
    body: JSON.stringify({ title: input.title, slug: input.slug, excerpt: input.excerpt, content: input.body, status: 'draft' })
  });
  if (!response.ok) throw new Error('WORDPRESS_HTTP_' + response.status);
  const result = await response.json() as CmsDraftResult;
  if (!result.id) throw new Error('WORDPRESS_INVALID_RESPONSE');
  return result;
}
