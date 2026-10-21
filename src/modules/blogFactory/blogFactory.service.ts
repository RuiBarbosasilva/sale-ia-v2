import { PrismaClient } from '@prisma/client';
import { sendWordPressDraft } from './wordpressPublisher';

const prisma = new PrismaClient();

const MAX_ARTICLE_CHARS = 18000;
function sanitizeHtml(value: string): string {
  const withoutActiveContent = value
    .replace(/<\s*(script|style|iframe|object|embed|svg|math|form|input|button|video|audio|source)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*(script|style|iframe|object|embed|svg|math|form|input|button|video|audio|source)\b[^>]*\/?\s*>/gi, '');
  const allowed = new Set(['p', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'strong', 'em', 'b', 'i', 'blockquote', 'a', 'br', 'hr']);
  return withoutActiveContent.replace(/<[^>]*>/g, (tag) => {
    const match = tag.match(/^<\s*(\/?)\s*([a-z0-9]+)[^>]*>$/i);
    if (!match) return '';
    const name = match[2].toLowerCase();
    if (!allowed.has(name)) return '';
    if (match[1]) return name === 'br' || name === 'hr' ? '' : '</' + name + '>';
    return name === 'br' || name === 'hr' ? '<' + name + '>' : '<' + name + '>';
  });
}

function slugify(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 120) || 'artigo';
}
async function generateWithAI(topic: { title: string; summary: string; sourceUrl: string; sourceName: string }) {
  const apiKey = process.env.BLOG_FACTORY_AI_API_KEY || process.env.OPENAI_API_KEY;
  const endpoint = (process.env.BLOG_FACTORY_AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
  const model = process.env.BLOG_FACTORY_AI_MODEL || 'gpt-4o-mini';
  if (!apiKey) throw new Error('AI_PROVIDER_NOT_CONFIGURED');
  const response = await fetch(endpoint + '/chat/completions', {
    method: 'POST',
    headers: { authorization: 'Bearer ' + apiKey, 'content-type': 'application/json' },
    signal: AbortSignal.timeout(60000),
    body: JSON.stringify({ model, temperature: 0.4, response_format: { type: 'json_object' }, messages: [
      { role: 'system', content: 'Escreva conteúdo editorial original em português brasileiro. Não copie frases, não invente fatos, números ou citações. O resumo RSS pode ser incompleto e não comprova que o conteúdo integral foi consultado. Se faltarem dados, liste as verificações pendentes. Retorne JSON com title, excerpt, category, body (HTML simples) e factChecks (array de strings).' },
      { role: 'user', content: JSON.stringify({ pauta: topic.title, resumo_disponivel: topic.summary, fonte: topic.sourceName, url_da_fonte: topic.sourceUrl, instrucoes: 'Crie um rascunho original com contexto apenas sustentado pelos dados fornecidos. Não reproduza o texto original.' }) }
    ] })
  });
  if (!response.ok) throw new Error('AI_PROVIDER_HTTP_' + response.status);
  const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('AI_EMPTY_RESPONSE');
  const cleaned = content.replace(/^\s*```(?:json)?/i, '').replace(/```\s*$/, '').trim();
  const start = cleaned.indexOf('{'), end = cleaned.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('AI_INVALID_JSON');
  const obj = JSON.parse(cleaned.slice(start, end)) as Record<string, unknown>;
  const str = (key: string, max: number) => typeof obj[key] === 'string' ? (obj[key] as string).trim().slice(0, max) : '';
  const factChecks = Array.isArray(obj.factChecks) ? obj.factChecks.filter((v): v is string => typeof v === 'string').slice(0, 30) : [];
  const title = str('title', 220), excerpt = str('excerpt', 600), body = str('body', MAX_ARTICLE_CHARS);
  if (!title || body.replace(/<[^>]*>/g, ' ').trim().length < 500) throw new Error('AI_QUALITY_GATE_FAILED');
  return { title, excerpt, category: str('category', 80) || 'Atualidades', body, factChecks };
}

const DEFAULT_FEEDS = [
  'https://g1.globo.com/rss/g1/',
  'https://agenciabrasil.ebc.com.br/rss/ultimasnoticias/feed.xml',
];

export type FeedItem = { title: string; url: string; publishedAt: string | null; summary: string; source: string };

function decodeXml(value: string): string {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

function tag(block: string, name: string): string {
  const match = block.match(new RegExp('<(?:[\\w-]+:)?' + name + '(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[\\w-]+:)?' + name + '>', 'i'));
  if (match) return decodeXml(match[1]);
  const attr = name === 'link' ? block.match(/<link[^>]+href=["']([^"']+)["']/i) : null;
  return attr ? attr[1] : '';
}

function parseFeed(xml: string, source: string): FeedItem[] {
  const blocks = xml.match(/<(item|entry)(?:\s[^>]*)?>[\s\S]*?<\/(?:item|entry)>/gi) || [];
  return blocks.map(block => {
    const url = tag(block, 'link') || tag(block, 'guid') || tag(block, 'id');
    return {
      title: tag(block, 'title'),
      url,
      publishedAt: tag(block, 'pubDate') || tag(block, 'published') || tag(block, 'updated') || null,
      summary: tag(block, 'description') || tag(block, 'summary') || tag(block, 'content'),
      source,
    };
  }).filter(item => item.title.length > 0 && /^https?:\/\//i.test(item.url));
}

export async function discoverTrends() {
  const configured = (process.env.BLOG_FACTORY_RSS_FEEDS || '').split(',').map(v => v.trim()).filter(Boolean);
  const feeds = configured.length ? configured : DEFAULT_FEEDS;
  const collected: FeedItem[] = [];
  const errors: string[] = [];
  for (const url of feeds) {
    try {
      const response = await fetch(url, { headers: { 'user-agent': 'Sale-IAV2-BlogFactory/1.0 (+RSS reader)' }, signal: AbortSignal.timeout(12000) });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const xml = await response.text();
      collected.push(...parseFeed(xml, url));
    } catch (error) {
      errors.push(url + ': ' + (error instanceof Error ? error.message : 'feed unavailable'));
    }
  }
  const seen = new Set<string>();
  const unique = collected.filter(item => {
    const key = item.title.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const saved: Array<{id: string}> = [];
  for (const item of unique.slice(0, 100)) {
    const existing = await prisma.blogFactoryTopic.findUnique({ where: { sourceUrl: item.url } });
    if (existing) continue;
    saved.push(await prisma.blogFactoryTopic.create({ data: {
      title: item.title, sourceUrl: item.url, sourceName: item.source,
      summary: item.summary.slice(0, 5000), trendScore: item.publishedAt && Number.isFinite(Date.parse(item.publishedAt)) ? Math.max(0, Math.min(100, 100 - Math.floor(Math.max(0, Date.now() - Date.parse(item.publishedAt)) / 86400000) * 12)) : 0, sourcePublishedAt: item.publishedAt && Number.isFinite(Date.parse(item.publishedAt)) ? new Date(item.publishedAt) : null,
      status: 'DISCOVERED',
    } }));
  }
  return { feedsChecked: feeds.length, fetched: collected.length, newTopics: saved.length, errors };
}

export async function listTopics(status?: string) {
  return prisma.blogFactoryTopic.findMany({
    where: status ? { status } : undefined,
    orderBy: [{ trendScore: 'desc' }, { createdAt: 'desc' }], take: 100,
  });
}

export async function listArticles(status?: string) {
  return prisma.blogFactoryArticle.findMany({
    where: status ? { status } : undefined,
    orderBy: [{ updatedAt: 'desc' }], take: 100,
    include: { topic: true },
  });
}

export async function createDraft(topicId: string) {
  const topic = await prisma.blogFactoryTopic.findUnique({ where: { id: topicId } });
  if (!topic) throw new Error('TOPIC_NOT_FOUND');
  const article = await prisma.blogFactoryArticle.create({ data: {
    topicId: topic.id,
    title: topic.title,
    slug: slugify(topic.title) + '-' + topic.id.slice(0, 8),
    excerpt: topic.summary.slice(0, 320),
    body: '',
    status: 'DRAFT',
    sourceUrls: JSON.stringify([{ title: topic.title, url: topic.sourceUrl, source: topic.sourceName }]),
    qualityNotes: JSON.stringify(['Rascunho criado a partir de metadados RSS. Texto integral não foi copiado.', 'Redação IA e verificação factual ainda precisam ser executadas antes da publicação.']),
  } });
  await prisma.blogFactoryTopic.update({ where: { id: topic.id }, data: { status: 'DRAFT_CREATED' } });
  return article;
}

export async function generateArticle(id: string) {
  const topic = await prisma.blogFactoryTopic.findUnique({ where: { id } });
  if (!topic) throw new Error('TOPIC_NOT_FOUND');
  const existing = await prisma.blogFactoryArticle.findFirst({ where: { topicId: id, status: { not: 'ARCHIVED' } } });
  if (existing) throw new Error('ARTICLE_ALREADY_EXISTS');
  const generated = await generateWithAI(topic);
  const article = await prisma.blogFactoryArticle.create({ data: {
    topicId: topic.id, title: generated.title, slug: slugify(generated.title) + '-' + topic.id.slice(0, 8),
    excerpt: generated.excerpt, body: generated.body, category: generated.category, status: 'NEEDS_REVIEW',
    sourceUrls: JSON.stringify([{ title: topic.title, url: topic.sourceUrl, source: topic.sourceName }]),
    qualityNotes: JSON.stringify([...generated.factChecks, 'Rascunho de IA; revisão factual humana pendente. A fonte não foi verificada automaticamente.'])
  } });
  await prisma.blogFactoryTopic.update({ where: { id: topic.id }, data: { status: 'ARTICLE_GENERATED' } });
  return article;
}

export async function runAutomationCycle() {
  const research = await discoverTrends();
  const maxPerCycle = Math.max(1, Math.min(10, Number(process.env.BLOG_FACTORY_MAX_ARTICLES_PER_CYCLE) || 3));
  let generated = 0;
  if (process.env.BLOG_FACTORY_AI_ENABLED === 'true') {
    const topics = await prisma.blogFactoryTopic.findMany({ where: { status: 'DISCOVERED' }, orderBy: [{ trendScore: 'desc' }, { createdAt: 'desc' }], take: maxPerCycle });
    for (const topic of topics) {
      try { await generateArticle(topic.id); generated++; }
      catch (error) { console.error('[BLOG FACTORY] generation failed:', topic.id, error instanceof Error ? error.message : error); }
    }
  }
  return { ...research, generated, aiEnabled: process.env.BLOG_FACTORY_AI_ENABLED === 'true' };
}

export async function updateDraft(id: string, input: { title?: string; excerpt?: string; body?: string; category?: string }) {
  const article = await prisma.blogFactoryArticle.findUnique({ where: { id } });
  if (!article) throw new Error('ARTICLE_NOT_FOUND');
  if (article.status === 'PUBLISHED') throw new Error('PUBLISHED_ARTICLE_REQUIRES_VERSIONED_UPDATE');
  if (article.status === 'CMS_DRAFT') throw new Error('ARTICLE_ALREADY_SENT_TO_CMS');
  return prisma.blogFactoryArticle.update({ where: { id }, data: {
    ...(input.title !== undefined ? { title: input.title.trim().slice(0, 220) } : {}),
    ...(input.excerpt !== undefined ? { excerpt: input.excerpt.trim().slice(0, 600) } : {}),
    ...(input.body !== undefined ? { body: sanitizeHtml(input.body).slice(0, 100000) } : {}),
    ...(input.category !== undefined ? { category: input.category.trim().slice(0, 80) } : {}),
  } });
}

export async function approveArticle(id: string) {
  const article = await prisma.blogFactoryArticle.findUnique({ where: { id } });
  if (!article) throw new Error('ARTICLE_NOT_FOUND');
  if (article.status === 'CMS_DRAFT') throw new Error('ARTICLE_ALREADY_SENT_TO_CMS');
  if (!article.title.trim()) throw new Error('QUALITY_GATE_TITLE_REQUIRED');
  if (article.body.replace(/<[^>]*>/g, ' ').trim().length < 500) throw new Error('QUALITY_GATE_BODY_TOO_SHORT');
  let sources: unknown;
  try { sources = JSON.parse(article.sourceUrls); } catch { throw new Error('QUALITY_GATE_SOURCES_INVALID'); }
  if (!Array.isArray(sources) || sources.length === 0 || !sources.every((source) => source && typeof source.url === 'string' && /^https?:\/\//i.test(source.url))) throw new Error('QUALITY_GATE_SOURCES_REQUIRED');
  return prisma.blogFactoryArticle.update({ where: { id }, data: { status: 'APPROVED' } });
}

export async function publishArticle(id: string) {
  const article = await prisma.blogFactoryArticle.findUnique({ where: { id } });
  if (!article) throw new Error('ARTICLE_NOT_FOUND');
  if (article.status === 'CMS_DRAFT') throw new Error('ARTICLE_ALREADY_SENT_TO_CMS');
  if (article.status !== 'APPROVED') throw new Error('HUMAN_APPROVAL_REQUIRED');
  if (article.body.replace(/<[^>]*>/g, ' ').trim().length < 500) throw new Error('QUALITY_GATE_BODY_TOO_SHORT');
  let sources: unknown;
  try { sources = JSON.parse(article.sourceUrls); } catch { throw new Error('QUALITY_GATE_SOURCES_INVALID'); }
  if (!Array.isArray(sources) || sources.length === 0 || !sources.every((source) => source && typeof source.url === 'string' && /^https?:\/\//i.test(source.url))) throw new Error('QUALITY_GATE_SOURCES_REQUIRED');
  const cms = await sendWordPressDraft({ title: article.title, slug: article.slug, excerpt: article.excerpt, body: article.body });
  return prisma.blogFactoryArticle.update({ where: { id }, data: {
    status: 'CMS_DRAFT',
    qualityNotes: JSON.stringify({ previous: article.qualityNotes, cms: 'WordPress', cmsPostId: cms.id, cmsLink: cms.link || null, cmsStatus: cms.status || 'draft', note: 'Enviado ao WordPress como rascunho; não publicado publicamente.' })
  } });
}

export async function getStatus() {
  const [topics, drafts, published] = await Promise.all([
    prisma.blogFactoryTopic.count(),
    prisma.blogFactoryArticle.count({ where: { status: { in: ['DRAFT', 'NEEDS_REVIEW', 'APPROVED'] } } }),
    prisma.blogFactoryArticle.count({ where: { status: 'PUBLISHED' } }),
  ]);
  return { module: 'blog-factory-ia', status: 'ONLINE', topics, drafts, published, cmsDrafts: await prisma.blogFactoryArticle.count({ where: { status: 'CMS_DRAFT' } }), aiEnabled: process.env.BLOG_FACTORY_AI_ENABLED === 'true', schedulerEnabled: process.env.BLOG_FACTORY_AUTORUN_ENABLED === 'true', wordpressConfigured: Boolean(process.env.BLOG_FACTORY_WORDPRESS_URL && process.env.BLOG_FACTORY_WORDPRESS_USERNAME && process.env.BLOG_FACTORY_WORDPRESS_APP_PASSWORD), publishingMode: 'DRAFT_REQUIRES_REVIEW' };
}
