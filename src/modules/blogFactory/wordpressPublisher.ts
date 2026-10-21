export type CmsDraftResult = { id: number; link?: string; status?: string };

export async function sendWordPressDraft(input: { title: string; slug: string; excerpt: string; body: string }) {
  const baseUrl = process.env.BLOG_FACTORY_WORDPRESS_URL?.replace(/\/$/, '');
  const username = process.env.BLOG_FACTORY_WORDPRESS_USERNAME;
  const appPassword = process.env.BLOG_FACTORY_WORDPRESS_APP_PASSWORD;
  if (!baseUrl || !username || !appPassword) throw new Error('WORDPRESS_NOT_CONFIGURED');
  const auth = Buffer.from(username + ':' + appPassword).toString('base64');
  const response = await fetch(baseUrl + '/wp-json/wp/v2/posts', {
    method: 'POST',
    headers: { authorization: 'Basic ' + auth, 'content-type': 'application/json' },
    signal: AbortSignal.timeout(30000),
    body: JSON.stringify({ title: input.title, slug: input.slug, excerpt: input.excerpt, content: input.body, status: 'draft' })
  });
  if (!response.ok) throw new Error('WORDPRESS_HTTP_' + response.status);
  const result = await response.json() as CmsDraftResult;
  if (!result.id) throw new Error('WORDPRESS_INVALID_RESPONSE');
  return result;
}
