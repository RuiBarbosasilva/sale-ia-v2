import { PrismaClient } from '@prisma/client';
import { sendWordPressDraft } from './wordpressPublisher';

const prisma = new PrismaClient();
const MAX_FEEDS = 20;
const ARTICLE_MIN_LENGTH = 500;

type Topic = {
  id: string; title: string; sourceUrl: string; sourceName: string; summary: string;
  trendScore: number; sourcePublishedAt: Date | null; status: string;
};

function slugify(value: string): string {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90) || 'artigo';
}
function stripCdata(value: string): string {
  return value.replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '').replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
}
function tag(block: string, name: string): string {
  const match = block.match(new RegExp('<(?:\\w+:)?' + name + '\\b[^>]*>([\\s\\S]*?)<\\/(?:\\w+:)?' + name + '>', 'i'));
  return match ? stripCdata(match[1]) : '';
}
function configuredFeeds(): string[] {
  return (process.env.BLOG_FACTORY_FEEDS || '').split(/[\n,;]/).map(x => x.trim()).filter(Boolean).slice(0, MAX_FEEDS);
}
function errorCode(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error && (error as {code?: unknown}).code === 'P2025') return 'ARTICLE_NOT_FOUND';
  return error instanceof Error ? error.message : 'INTERNAL_ERROR';
}

export class BlogFactoryService {
  async getStatus() {
    const [topics, drafts, approved, sent] = await Promise.all([
      prisma.blogFactoryTopic.count(),
      prisma.blogFactoryArticle.count({ where: { status: 'DRAFT' } }),
      prisma.blogFactoryArticle.count({ where: { status: 'APPROVED' } }),
      prisma.blogFactoryArticle.count({ where: { status: 'SENT_TO_WORDPRESS_DRAFT' } })
    ]);
    return {
      module: 'blog-factory-ia',
      status: 'READY',
      automationEnabled: String(process.env.BLOG_FACTORY_AUTORUN_ENABLED || '').toLowerCase() === 'true',
      aiConfigured: Boolean(process.env.OPENAI_API_KEY),
      wordpressConfigured: Boolean(process.env.BLOG_FACTORY_WORDPRESS_URL && process.env.BLOG_FACTORY_WORDPRESS_USERNAME && process.env.BLOG_FACTORY_WORDPRESS_APP_PASSWORD),
      feedsConfigured: configuredFeeds().length,
      counts: { topics, drafts, approved, sentToWordPressDraft: sent }
    };
  }

  async discoverTrends() {
    const feeds = configuredFeeds();
    if (!feeds.length) throw new Error('BLOG_FACTORY_FEEDS_NOT_CONFIGURED');
    let discovered = 0;
    const failures: string[] = [];
    for (const feedUrl of feeds) {
      try {
        const parsed = new URL(feedUrl);
        if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('INVALID_FEED_URL');
        const response = await fetch(feedUrl, { signal: AbortSignal.timeout(15000), headers: { accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml' } });
        if (!response.ok) throw new Error('FEED_HTTP_' + response.status);
        const xml = await response.text();
        if (xml.length > 2_000_000) throw new Error('FEED_TOO_LARGE');
        const blocks = xml.match(/<(?:item|entry)\b[^>]*>[\s\S]*?<\/(?:item|entry)>/gi) || [];
        for (const block of blocks.slice(0, 30)) {
          const title = tag(block, 'title');
          let sourceUrl = tag(block, 'link');
          if (!sourceUrl) {
            const href = block.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*\/?\s*>/i);
            sourceUrl = href?.[1] || '';
          }
          const summary = tag(block, 'description') || tag(block, 'summary') || tag(block, 'content');
          const dateRaw = tag(block, 'pubDate') || tag(block, 'published') || tag(block, 'updated');
          if (!title || !sourceUrl) continue;
          let normalized: string;
          try { const u = new URL(sourceUrl, feedUrl); if (!['http:', 'https:'].includes(u.protocol)) continue; normalized = u.toString(); }
          catch { continue; }
          const sourcePublishedAt = dateRaw && Number.isFinite(Date.parse(dateRaw)) ? new Date(dateRaw) : null;
          await prisma.blogFactoryTopic.upsert({
            where: { sourceUrl: normalized },
            create: { title: title.slice(0, 300), sourceUrl: normalized, sourceName: parsed.hostname, summary: summary.slice(0, 4000), trendScore: 0, sourcePublishedAt, status: 'DISCOVERED' },
            update: { title: title.slice(0, 300), summary: summary.slice(0, 4000), sourcePublishedAt }
          });
          discovered++;
        }
      } catch (error) {
        let host = 'invalid-feed-url';
        try { host = new URL(feedUrl).hostname; } catch { /* report malformed feed without masking the original error */ }
        failures.push(host + ':' + errorCode(error));
      }
    }
    return { discovered, feedsChecked: feeds.length, failures };
  }

  async listTopics(status?: string) {
    return prisma.blogFactoryTopic.findMany({
      ...(status ? { where: { status } } : {}),
      orderBy: [{ trendScore: 'desc' }, { createdAt: 'desc' }], take: 200
    });
  }

  async listArticles(status?: string) {
    return prisma.blogFactoryArticle.findMany({
      ...(status ? { where: { status } } : {}),
      include: { topic: { select: { title: true, sourceUrl: true, sourceName: true } } },
      orderBy: { updatedAt: 'desc' }, take: 200
    });
  }

  async generateArticle(topicId: string) {
    const topic = await prisma.blogFactoryTopic.findUnique({ where: { id: topicId } });
    if (!topic) throw new Error('TOPIC_NOT_FOUND');
    const existingArticle = await prisma.blogFactoryArticle.findFirst({ where: { topicId } });
    if (existingArticle) throw new Error('TOPIC_ALREADY_HAS_ARTICLE');
    if (!process.env.OPENAI_API_KEY) throw new Error('AI_PROVIDER_NOT_CONFIGURED');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + process.env.OPENAI_API_KEY },
      signal: AbortSignal.timeout(60000),
      body: JSON.stringify({
        model: process.env.BLOG_FACTORY_AI_MODEL || 'gpt-4o-mini',
        temperature: 0.5,
        messages: [
          { role: 'system', content: 'Você é um editor SEO. Escreva em português brasileiro um artigo original, útil e factual, com título, resumo e corpo em HTML seguro. Não invente dados nem copie a fonte. Cite a fonte original e diferencie fatos de opinião. Retorne JSON válido com title, excerpt, body, category. body deve conter HTML sem scripts, iframes ou estilos inline. Nunca publique automaticamente.' },
          { role: 'user', content: JSON.stringify({ tema: topic.title, resumoFonte: topic.summary, fonte: topic.sourceUrl, instrucoes: 'Produza artigo de pelo menos 600 palavras, com subtítulos H2/H3, introdução, conclusão e CTA moderado. Use apenas informações suportadas pela fonte ou conhecimento geral confiável.' }) }
        ],
        response_format: { type: 'json_object' }
      })
    });
    if (!response.ok) throw new Error('AI_PROVIDER_HTTP_' + response.status);
    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const raw = data.choices?.[0]?.message?.content;
    if (!raw) throw new Error('AI_PROVIDER_EMPTY_RESPONSE');
    let generated: {title?: string; excerpt?: string; body?: string; category?: string};
    try { generated = JSON.parse(raw); } catch { throw new Error('AI_PROVIDER_INVALID_JSON'); }
    const title = String(generated.title || topic.title).trim().slice(0, 300);
    const excerpt = String(generated.excerpt || topic.summary).trim().slice(0, 1000);
    const body = String(generated.body || '').trim();
    if (body.replace(/<[^>]*>/g, ' ').trim().length < ARTICLE_MIN_LENGTH) throw new Error('QUALITY_GATE_ARTICLE_TOO_SHORT');
    const baseSlug = slugify(title);
    let slug = baseSlug;
    for (let suffix = 2; await prisma.blogFactoryArticle.findUnique({ where: { slug } }); suffix++) slug = baseSlug.slice(0, 80) + '-' + suffix;
    const article = await prisma.blogFactoryArticle.create({
      data: { topicId, title, slug, excerpt, body, category: generated.category ? String(generated.category).slice(0, 100) : null,
        status: 'DRAFT', sourceUrls: JSON.stringify([topic.sourceUrl]), qualityNotes: JSON.stringify(['Revisão humana necessária antes de qualquer publicação.']) }
    });
    await prisma.blogFactoryTopic.update({ where: { id: topicId }, data: { status: 'ARTICLE_CREATED' } });
    return article;
  }

  async createDraft(topicId: string) {
    return this.generateArticle(topicId);
  }

  async updateDraft(id: string, input: {title?: string; excerpt?: string; body?: string; category?: string}) {
    const article = await prisma.blogFactoryArticle.findUnique({ where: { id } });
    if (!article) throw new Error('ARTICLE_NOT_FOUND');
    if (article.status !== 'DRAFT') throw new Error('ARTICLE_ALREADY_REVIEWED');
    const data: Record<string, string | null> = {};
    if (input.title !== undefined) data.title = input.title.trim().slice(0, 300);
    if (input.excerpt !== undefined) data.excerpt = input.excerpt.trim().slice(0, 1000);
    if (input.body !== undefined) data.body = input.body.trim();
    if (input.category !== undefined) data.category = input.category.trim().slice(0, 100) || null;
    if (!Object.keys(data).length) throw new Error('NO_VALID_FIELDS');
    return prisma.blogFactoryArticle.update({ where: { id }, data });
  }

  async approveArticle(id: string) {
    const article = await prisma.blogFactoryArticle.findUnique({ where: { id } });
    if (!article) throw new Error('ARTICLE_NOT_FOUND');
    if (article.status !== 'DRAFT') throw new Error('ARTICLE_ALREADY_REVIEWED');
    if (article.title.trim().length < 10 || article.body.replace(/<[^>]*>/g, ' ').trim().length < ARTICLE_MIN_LENGTH) {
      throw new Error('QUALITY_GATE_INCOMPLETE_ARTICLE');
    }
    return prisma.blogFactoryArticle.update({
      where: { id },
      data: { status: 'APPROVED', qualityNotes: JSON.stringify(['Aprovado por operador via endpoint administrativo.']) }
    });
  }

  async publishArticle(id: string) {
    const article = await prisma.blogFactoryArticle.findUnique({ where: { id } });
    if (!article) throw new Error('ARTICLE_NOT_FOUND');
    if (article.status === 'SENT_TO_WORDPRESS_DRAFT' || article.wordpressPostId) throw new Error('ARTICLE_ALREADY_SENT_TO_WORDPRESS');
    if (article.status !== 'APPROVED') throw new Error('HUMAN_APPROVAL_REQUIRED');
    const sources = JSON.parse(article.sourceUrls || '[]') as string[];
    const safeSources = sources.filter(url => { try { return ['http:', 'https:'].includes(new URL(url).protocol); } catch { return false; } });
    const escapeHtml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const sourceBlock = safeSources.length
      ? '<p><strong>Fontes:</strong> ' + safeSources.map(url => '<a href="' + escapeHtml(url) + '" rel="nofollow noopener">' + escapeHtml(url) + '</a>').join(' · ') + '</p>'
      : '';
    const result = await sendWordPressDraft({
      title: article.title, slug: article.slug, excerpt: article.excerpt,
      body: article.body + sourceBlock
    });
    return prisma.blogFactoryArticle.update({
      where: { id },
      data: { status: 'SENT_TO_WORDPRESS_DRAFT', wordpressPostId: result.id, wordpressLink: result.link || null, qualityNotes: JSON.stringify(['Enviado ao WordPress como rascunho. ID WordPress: ' + result.id, result.link || '']) }
    });
  }

  async runAutomationCycle() {
    const research = await this.discoverTrends();
    const topics = await prisma.blogFactoryTopic.findMany({ where: { status: 'DISCOVERED' }, orderBy: [{ trendScore: 'desc' }, { createdAt: 'desc' }], take: 3 });
    const generated: string[] = [];
    const failures: Array<{topicId: string; error: string}> = [];
    for (const topic of topics) {
      try { const article = await this.generateArticle(topic.id); generated.push(article.id); }
      catch (error) { failures.push({ topicId: topic.id, error: errorCode(error) }); }
    }
    return { research, topicsConsidered: topics.length, generatedArticleIds: generated, failures, requiresHumanApproval: true };
  }
}

export const blogFactoryService = new BlogFactoryService();
