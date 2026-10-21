import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DEFAULT_FEEDS = [
  'https://g1.globo.com/rss/g1/',
  'https://agenciabrasil.ebc.com.br/rss/ultimasnoticias/feed.xml',
];

export type FeedItem = { title: string; url: string; publishedAt: string | null; summary: string; source: string };

function decodeXml(value: string): string {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/<[^>]+>/g, ' ')
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
  const saved = [];
  for (const item of unique.slice(0, 100)) {
    const existing = await prisma.blogFactoryTopic.findUnique({ where: { sourceUrl: item.url } });
    if (existing) continue;
    saved.push(await prisma.blogFactoryTopic.create({ data: {
      title: item.title, sourceUrl: item.url, sourceName: item.source,
      summary: item.summary.slice(0, 5000), sourcePublishedAt: item.publishedAt ? new Date(item.publishedAt) : null,
      status: 'DISCOVERED',
    } }));
  }
  return { feedsChecked: feeds.length, fetched: collected.length, newTopics: saved.length, errors };
}

export async function listTopics(status?: string) {
  return prisma.blogFactoryTopic.findMany({
    where: status ? { status } : undefined,
    orderBy: [{ createdAt: 'desc' }], take: 100,
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
    slug: topic.title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 140),
    excerpt: topic.summary.slice(0, 320),
    body: '',
    status: 'DRAFT',
    sourceUrls: JSON.stringify([{ title: topic.title, url: topic.sourceUrl, source: topic.sourceName }]),
    qualityNotes: JSON.stringify(['Rascunho criado a partir de metadados RSS. Texto integral não foi copiado.', 'Redação IA e verificação factual ainda precisam ser executadas antes da publicação.']),
  } });
  await prisma.blogFactoryTopic.update({ where: { id: topic.id }, data: { status: 'DRAFT_CREATED' } });
  return article;
}

export async function updateDraft(id: string, input: { title?: string; excerpt?: string; body?: string; category?: string }) {
  const article = await prisma.blogFactoryArticle.findUnique({ where: { id } });
  if (!article) throw new Error('ARTICLE_NOT_FOUND');
  if (article.status === 'PUBLISHED') throw new Error('PUBLISHED_ARTICLE_REQUIRES_VERSIONED_UPDATE');
  return prisma.blogFactoryArticle.update({ where: { id }, data: {
    ...(input.title !== undefined ? { title: input.title.trim().slice(0, 220) } : {}),
    ...(input.excerpt !== undefined ? { excerpt: input.excerpt.trim().slice(0, 600) } : {}),
    ...(input.body !== undefined ? { body: input.body.slice(0, 100000) } : {}),
    ...(input.category !== undefined ? { category: input.category.trim().slice(0, 80) } : {}),
  } });
}

export async function publishArticle(id: string) {
  const article = await prisma.blogFactoryArticle.findUnique({ where: { id } });
  if (!article) throw new Error('ARTICLE_NOT_FOUND');
  if (!article.title.trim() || article.body.trim().length < 500) throw new Error('QUALITY_GATE_BODY_TOO_SHORT');
  let sources: Array<{url?: string; title?: string}> = [];
  try { sources = JSON.parse(article.sourceUrls); } catch { /* invalid source metadata fails below */ }
  if (!sources.length || sources.some(source => !source.url || !/^https?:\/\//i.test(source.url))) throw new Error('QUALITY_GATE_SOURCES_REQUIRED');
  if (process.env.BLOG_FACTORY_AUTO_PUBLISH !== 'true') throw new Error('PUBLISHING_DISABLED_CONFIGURE_BLOG_FACTORY_AUTO_PUBLISH');
  return prisma.blogFactoryArticle.update({ where: { id }, data: { status: 'PUBLISHED', publishedAt: new Date() } });
}

export async function getStatus() {
  const [topics, drafts, published] = await Promise.all([
    prisma.blogFactoryTopic.count(),
    prisma.blogFactoryArticle.count({ where: { status: 'DRAFT' } }),
    prisma.blogFactoryArticle.count({ where: { status: 'PUBLISHED' } }),
  ]);
  return { module: 'blog-factory-ia', status: 'ONLINE', topics, drafts, published, autoPublishEnabled: process.env.BLOG_FACTORY_AUTO_PUBLISH === 'true' };
}
