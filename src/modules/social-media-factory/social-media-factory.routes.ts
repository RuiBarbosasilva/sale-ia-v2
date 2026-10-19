import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import crypto from 'node:crypto';

const router = Router();
const prisma = new PrismaClient();
const PLATFORMS = ['INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'YOUTUBE', 'GOOGLE_BUSINESS', 'PINTEREST'] as const;
type Platform = typeof PLATFORMS[number];

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const expected = process.env.SALE_IA_ADMIN_KEY;
  if (!expected) return res.status(503).json({ error: 'SALE_IA_ADMIN_KEY não configurada no servidor.' });
  const provided = req.header('x-sale-ia-admin-key') || req.header('authorization')?.replace(/^Bearer\s+/i, '');
  if (!provided || provided.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected))) {
    return res.status(401).json({ error: 'Acesso não autorizado.' });
  }
  next();
}
router.use(requireAdmin);

function normalizePlatform(value: unknown): Platform | null {
  const normalized = String(value || '').trim().toUpperCase().replace(/[ -]/g, '_');
  return PLATFORMS.includes(normalized as Platform) ? normalized as Platform : null;
}
function slugify(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70);
}
function safeJson(value: unknown) {
  try { return JSON.stringify(value ?? null); } catch { return 'null'; }
}

router.get('/status', async (_req, res) => {
  const [workspaces, posts, scheduled, published, failed] = await Promise.all([
    prisma.socialWorkspace.count(), prisma.socialPost.count(),
    prisma.socialPost.count({ where: { status: 'SCHEDULED' } }),
    prisma.socialPost.count({ where: { status: 'PUBLISHED' } }),
    prisma.socialPost.count({ where: { status: { in: ['FAILED', 'INTEGRATION_REQUIRED'] } } }),
  ]);
  res.json({
    module: 'Social Media Factory IA', status: 'READY_FOR_CONFIGURATION',
    platforms: PLATFORMS.map(platform => ({ platform, publishing: 'REQUIRES_OAUTH_AND_PROVIDER_ADAPTER' })),
    metrics: { workspaces, posts, scheduled, published, failed },
    aiConfigured: Boolean(process.env.OPENAI_API_KEY),
    schedulerEnabled: String(process.env.SOCIAL_MEDIA_FACTORY_ENABLED).toLowerCase() === 'true',
    note: 'Publicação real só ocorre após configurar credenciais e adaptador oficial da plataforma.'
  });
});

router.get('/platforms', (_req, res) => res.json({ platforms: PLATFORMS }));

router.get('/workspaces', async (_req, res) => {
  const workspaces = await prisma.socialWorkspace.findMany({
    orderBy: { updatedAt: 'desc' },
    include: { accounts: { select: { id: true, platform: true, accountName: true, status: true, lastCheckedAt: true, lastError: true } },
      _count: { select: { posts: true } } }
  });
  res.json({ workspaces });
});

router.post('/workspaces', async (req, res) => {
  const name = String(req.body?.name || '').trim();
  if (name.length < 2 || name.length > 120) return res.status(400).json({ error: 'Informe um nome entre 2 e 120 caracteres.' });
  const baseSlug = slugify(String(req.body?.slug || name));
  if (!baseSlug) return res.status(400).json({ error: 'Nome/slug inválido.' });
  let slug = baseSlug;
  for (let i = 2; await prisma.socialWorkspace.findUnique({ where: { slug } }); i++) slug = baseSlug.slice(0, 64) + '-' + i;
  const workspace = await prisma.socialWorkspace.create({ data: {
    name, slug, niche: req.body?.niche ? String(req.body.niche).slice(0, 160) : null,
    timezone: String(req.body?.timezone || 'America/Sao_Paulo'),
    accounts: { create: PLATFORMS.map(platform => ({ platform, status: 'NOT_CONFIGURED' })) }
  }, include: { accounts: true } });
  res.status(201).json({ workspace });
});

router.get('/workspaces/:workspaceId/posts', async (req, res) => {
  const take = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
  const posts = await prisma.socialPost.findMany({
    where: { workspaceId: req.params.workspaceId, ...(req.query.status ? { status: String(req.query.status) } : {}) },
    orderBy: [{ scheduledFor: 'asc' }, { createdAt: 'desc' }], take,
    include: { logs: { orderBy: { createdAt: 'desc' }, take: 3 } }
  });
  res.json({ posts });
});

router.post('/workspaces/:workspaceId/posts', async (req, res) => {
  const workspace = await prisma.socialWorkspace.findUnique({ where: { id: req.params.workspaceId } });
  if (!workspace) return res.status(404).json({ error: 'Projeto não encontrado.' });
  const platform = normalizePlatform(req.body?.platform);
  const caption = String(req.body?.caption || '').trim();
  if (!platform) return res.status(400).json({ error: 'Plataforma inválida.' });
  if (!caption || caption.length > 5000) return res.status(400).json({ error: 'Legenda obrigatória (máximo 5.000 caracteres).' });
  const scheduledFor = req.body?.scheduledFor ? new Date(req.body.scheduledFor) : null;
  if (scheduledFor && Number.isNaN(scheduledFor.getTime())) return res.status(400).json({ error: 'Data de agendamento inválida.' });
  const post = await prisma.socialPost.create({ data: {
    workspaceId: workspace.id, platform, caption,
    title: req.body?.title ? String(req.body.title).slice(0, 200) : null,
    contentType: String(req.body?.contentType || 'IMAGE').toUpperCase(),
    hashtags: Array.isArray(req.body?.hashtags) ? req.body.hashtags.map(String).join(' ') : (req.body?.hashtags ? String(req.body.hashtags) : null),
    mediaUrls: Array.isArray(req.body?.mediaUrls) ? safeJson(req.body.mediaUrls) : null,
    linkUrl: req.body?.linkUrl ? String(req.body.linkUrl).slice(0, 2048) : null,
    scheduledFor, status: scheduledFor ? 'SCHEDULED' : 'DRAFT'
  } });
  res.status(201).json({ post });
});

router.post('/workspaces/:workspaceId/generate-batch', async (req, res) => {
  const workspace = await prisma.socialWorkspace.findUnique({ where: { id: req.params.workspaceId } });
  if (!workspace) return res.status(404).json({ error: 'Projeto não encontrado.' });
  if (!process.env.OPENAI_API_KEY) return res.status(503).json({ error: 'Configure OPENAI_API_KEY para habilitar a geração por IA.' });
  const topic = String(req.body?.topic || '').trim();
  if (topic.length < 3) return res.status(400).json({ error: 'Informe o tema/campanha.' });
  const count = Math.min(5, Math.max(1, Number(req.body?.count) || 5));
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.chat.completions.create({
    model: process.env.SOCIAL_MEDIA_AI_MODEL || 'gpt-4.1-mini',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: 'Você é estrategista de redes sociais em português brasileiro. Gere conteúdo original, útil, sem alegações não verificadas, sem hashtags excessivas. Retorne JSON {"posts":[{"platform":"INSTAGRAM|FACEBOOK|TIKTOK|YOUTUBE|GOOGLE_BUSINESS|PINTEREST","title":"...","caption":"...","hashtags":["..."],"contentType":"IMAGE|VIDEO|TEXT"}]}. Alterne plataformas e adapte tamanho/formato ao canal. Não invente fatos sobre a empresa.' },
      { role: 'user', content: JSON.stringify({ empresa: workspace.name, nicho: workspace.niche, tema: topic, quantidade: count, plataformas: PLATFORMS, instrucoesAdicionais: String(req.body?.instructions || '').slice(0, 2000) }) }
    ]
  });
  let generated: any;
  try { generated = JSON.parse(response.choices[0]?.message?.content || '{}'); } catch { return res.status(502).json({ error: 'A IA retornou conteúdo em formato inválido.' }); }
  if (!Array.isArray(generated.posts) || generated.posts.length === 0) return res.status(502).json({ error: 'A IA não gerou publicações válidas.' });
  const posts = [];
  for (const item of generated.posts.slice(0, count)) {
    const platform = normalizePlatform(item.platform);
    const caption = String(item.caption || '').trim();
    if (!platform || !caption) continue;
    posts.push(await prisma.socialPost.create({ data: {
      workspaceId: workspace.id, platform, title: item.title ? String(item.title).slice(0, 200) : null,
      caption: caption.slice(0, 5000), hashtags: Array.isArray(item.hashtags) ? item.hashtags.map(String).join(' ') : null,
      contentType: ['IMAGE', 'VIDEO', 'TEXT', 'CAROUSEL', 'SHORT'].includes(String(item.contentType).toUpperCase()) ? String(item.contentType).toUpperCase() : 'TEXT',
      status: 'DRAFT'
    } }));
  }
  res.status(201).json({ created: posts.length, posts, message: 'Conteúdo criado como rascunho; revise e agende.' });
});

router.post('/posts/:postId/schedule', async (req, res) => {
  const scheduledFor = new Date(req.body?.scheduledFor);
  if (Number.isNaN(scheduledFor.getTime()) || scheduledFor.getTime() <= Date.now()) return res.status(400).json({ error: 'Agende para uma data futura válida.' });
  const post = await prisma.socialPost.update({ where: { id: req.params.postId }, data: { scheduledFor, status: 'SCHEDULED', lastError: null } });
  res.json({ post });
});

router.post('/posts/:postId/publish', async (req, res) => {
  const post = await prisma.socialPost.findUnique({ where: { id: req.params.postId } });
  if (!post) return res.status(404).json({ error: 'Publicação não encontrada.' });
  const message = 'Nenhum adaptador de publicação oficial está habilitado para esta plataforma. Configure OAuth, permissões e o adaptador antes de publicar.';
  const updated = await prisma.socialPost.update({ where: { id: post.id }, data: { status: 'INTEGRATION_REQUIRED', attempts: { increment: 1 }, lastError: message } });
  await prisma.socialPublishLog.create({ data: { postId: post.id, platform: post.platform, outcome: 'INTEGRATION_REQUIRED', message } });
  res.status(409).json({ post: updated, error: message });
});

router.get('/posts/:postId/logs', async (req, res) => {
  const logs = await prisma.socialPublishLog.findMany({ where: { postId: req.params.postId }, orderBy: { createdAt: 'desc' }, take: 100 });
  res.json({ logs });
});

export default router;
