import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import crypto from 'node:crypto';
import { createSocialAuthorizationUrl, socialOAuthConfigurationStatus } from './social-media-factory.oauth';
import { publishQueuedSocialPost } from './social-media-factory.service';

const router = Router();
const prisma = new PrismaClient();
const PLATFORMS = ['INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'YOUTUBE', 'GOOGLE_BUSINESS', 'PINTEREST'] as const;
type Platform = typeof PLATFORMS[number];

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const expected = process.env.SALE_IA_ADMIN_KEY;
  if (!expected) return res.status(503).json({ error: 'SALE_IA_ADMIN_KEY não configurada no servidor.' });
  const provided = req.header('x-sale-ia-admin-key') || req.header('authorization')?.replace(/^Bearer\s+/i, '');
  const providedBuffer = Buffer.from(provided || '');
  const expectedBuffer = Buffer.from(expected);
  if (!provided || providedBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(providedBuffer, expectedBuffer)) {
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
  const [workspaces, posts, scheduled, published, failed, completedAutomationRuns] = await Promise.all([
    prisma.socialWorkspace.count(), prisma.socialPost.count(),
    prisma.socialPost.count({ where: { status: 'SCHEDULED' } }),
    prisma.socialPost.count({ where: { status: 'PUBLISHED' } }),
    prisma.socialPost.count({ where: { status: { in: ['FAILED', 'INTEGRATION_REQUIRED'] } } }),
    prisma.socialAutomationRun.count({ where: { status: 'COMPLETED' } }),
  ]);
  res.json({
    module: 'Social Media Factory IA', status: 'READY_FOR_CONFIGURATION',
    platforms: PLATFORMS.map(platform => ({ platform, publishing: 'REQUIRES_OAUTH_AND_PROVIDER_ADAPTER' })),
    metrics: { workspaces, posts, scheduled, published, failed, completedAutomationRuns },
    aiConfigured: Boolean(process.env.OPENAI_API_KEY),
    oauth: socialOAuthConfigurationStatus(),
    schedulerEnabled: String(process.env.SOCIAL_MEDIA_FACTORY_ENABLED).toLowerCase() === 'true',
    note: 'Publicação real só ocorre após configurar credenciais e adaptador oficial da plataforma.'
  });
});

router.get('/platforms', (_req, res) => res.json({ platforms: PLATFORMS }));

router.get('/workspaces', async (_req, res) => {
  const workspaces = await prisma.socialWorkspace.findMany({
    orderBy: { updatedAt: 'desc' },
    include: { accounts: { select: { id: true, platform: true, accountName: true, externalId: true, status: true, scopes: true, platformMetadata: true, lastCheckedAt: true, lastError: true } },
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

router.patch('/accounts/:accountId/target', async (req, res) => {
  const account = await prisma.socialAccount.findUnique({ where: { id: req.params.accountId }, include: { workspace: true } });
  if (!account || !account.workspace.active) return res.status(404).json({ error: 'Conta social ou projeto não encontrado.' });
  if (!['AUTHORIZED', 'CONNECTED', 'AVAILABLE'].includes(account.status) || !account.accessTokenEncrypted) return res.status(409).json({ error: 'Autorize a conta OAuth antes de configurar o destino.' });
  const externalId = String(req.body?.externalId || '').trim();
  if (account.platform === 'GOOGLE_BUSINESS' && !/^accounts\/[^/]+\/locations\/[^/]+$/.test(externalId)) {
    return res.status(400).json({ error: 'Use o caminho completo accounts/{accountId}/locations/{locationId} do Google Business Profile.' });
  }
  if (account.platform === 'PINTEREST' && !externalId) return res.status(400).json({ error: 'O nome de usuário Pinterest não pode ficar vazio.' });
  const metadata: Record<string, string> = {};
  if (account.platform === 'PINTEREST') {
    const boardId = String(req.body?.boardId || '').trim();
    if (!boardId) return res.status(400).json({ error: 'Informe o ID do board do Pinterest para criar Pins.' });
    metadata.boardId = boardId;
  }
  if (account.platform !== 'GOOGLE_BUSINESS' && account.platform !== 'PINTEREST') return res.status(400).json({ error: 'Esta plataforma obtém o destino automaticamente no OAuth.' });
  const updated = await prisma.socialAccount.update({ where: { id: account.id }, data: {
    externalId, accountName: req.body?.accountName ? String(req.body.accountName).slice(0, 160) : account.accountName,
    platformMetadata: Object.keys(metadata).length ? JSON.stringify(metadata) : account.platformMetadata,
    status: account.status === 'AVAILABLE' ? 'AVAILABLE' : 'CONNECTED', lastError: null, lastCheckedAt: new Date()
  }, select: { id: true, platform: true, accountName: true, externalId: true, status: true, platformMetadata: true } });
  res.json({ account: updated });
});

router.patch('/workspaces/:workspaceId/automation', async (req, res) => {
  const workspace = await prisma.socialWorkspace.findUnique({ where: { id: req.params.workspaceId } });
  if (!workspace) return res.status(404).json({ error: 'Projeto não encontrado.' });
  const current = (() => { try { return JSON.parse(workspace.settings || '{}'); } catch { return {}; } })();
  const autoGenerateEnabled = typeof req.body?.autoGenerateEnabled === 'boolean' ? req.body.autoGenerateEnabled : current.autoGenerateEnabled === true;
  const autoPublishEnabled = typeof req.body?.autoPublishEnabled === 'boolean' ? req.body.autoPublishEnabled : current.autoPublishEnabled === true;
  if (autoPublishEnabled && !autoGenerateEnabled) return res.status(400).json({ error: 'Ative a geração automática antes de ativar a publicação automática.' });
  if (autoPublishEnabled) {
    const platforms = ['INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'YOUTUBE', 'GOOGLE_BUSINESS', 'PINTEREST'];
    for (const platform of platforms) {
      const accounts = await prisma.socialAccount.findMany({ where: { workspaceId: workspace.id, platform, status: { in: ['CONNECTED', 'AUTHORIZED'] }, accessTokenEncrypted: { not: null } } });
      if (accounts.length !== 1) return res.status(409).json({ error: platform + ': conecte exatamente uma conta autorizada neste projeto antes de ativar a publicação automática.' });
      const account = accounts[0];
      if (!account.externalId) return res.status(409).json({ error: platform + ': a conta autorizada ainda não tem um destino identificado.' });
      if (platform === 'GOOGLE_BUSINESS' && !/^accounts\/[^/]+\/locations\/[^/]+$/.test(account.externalId || '')) return res.status(409).json({ error: 'Configure o destino de localização do Google Business antes de ativar a publicação automática.' });
      if (platform === 'PINTEREST') {
        let metadata: any = {};
        try { metadata = JSON.parse(account.platformMetadata || '{}'); } catch {}
        if (!metadata.boardId) return res.status(409).json({ error: 'Configure o board do Pinterest antes de ativar a publicação automática.' });
      }
    }
    if (String(process.env.SOCIAL_MEDIA_IMAGE_GENERATION_ENABLED).toLowerCase() !== 'true' || String(process.env.SOCIAL_MEDIA_VIDEO_GENERATION_ENABLED).toLowerCase() !== 'true') {
      return res.status(409).json({ error: 'Para publicação automática em todas as redes, habilite SOCIAL_MEDIA_IMAGE_GENERATION_ENABLED=true e SOCIAL_MEDIA_VIDEO_GENERATION_ENABLED=true.' });
    }
    let base: URL;
    try { base = new URL(String(process.env.PUBLIC_BASE_URL || '')); } catch { return res.status(409).json({ error: 'Configure PUBLIC_BASE_URL HTTPS para que as redes possam acessar as mídias geradas.' }); }
    if (base.protocol !== 'https:') return res.status(409).json({ error: 'PUBLIC_BASE_URL precisa ser HTTPS público.' });
    const allowedHosts = (process.env.SOCIAL_MEDIA_MEDIA_ALLOWED_HOSTS || '').split(',').map((x: string) => x.trim().toLowerCase()).filter(Boolean);
    if (!allowedHosts.includes(base.hostname.toLowerCase())) return res.status(409).json({ error: 'Inclua o domínio de PUBLIC_BASE_URL em SOCIAL_MEDIA_MEDIA_ALLOWED_HOSTS para validar mídia do YouTube.' });
  }
  const settings = {
    ...current, autoGenerateEnabled, autoPublishEnabled,
    contentTheme: String(req.body?.contentTheme ?? current.contentTheme ?? workspace.niche ?? workspace.name).slice(0, 300),
    brandVoice: String(req.body?.brandVoice ?? current.brandVoice ?? 'profissional, humano e confiável').slice(0, 300),
    contentInstructions: String(req.body?.contentInstructions ?? current.contentInstructions ?? '').slice(0, 2000),
    postsPerDayPerPlatform: 5
  };
  const updated = await prisma.socialWorkspace.update({ where: { id: workspace.id }, data: { settings: JSON.stringify(settings) }, select: { id: true, name: true, settings: true } });
  res.json({ workspace: updated, message: autoPublishEnabled ? 'Automação ativada. Serão criados até 5 conteúdos diários por rede; TikTok continuará exigindo consentimento explícito por publicação.' : 'Configurações de automação salvas.' });
});

router.post('/accounts/:accountId/select', async (req, res) => {
  const account = await prisma.socialAccount.findUnique({ where: { id: req.params.accountId } });
  if (!account || !account.accessTokenEncrypted || !['CONNECTED', 'AUTHORIZED', 'AVAILABLE'].includes(account.status)) return res.status(409).json({ error: 'Autorize esta conta antes de selecioná-la.' });
  await prisma.$transaction([
    prisma.socialAccount.updateMany({ where: { workspaceId: account.workspaceId, platform: account.platform, status: { in: ['CONNECTED', 'AUTHORIZED'] } }, data: { status: 'AVAILABLE' } }),
    prisma.socialAccount.update({ where: { id: account.id }, data: { status: 'CONNECTED', lastError: null } })
  ]);
  res.json({ selected: true, accountId: account.id, platform: account.platform, message: 'Conta de destino selecionada para este projeto.' });
});

router.post('/accounts/:accountId/connect', async (req, res) => {
  try {
    const account = await prisma.socialAccount.findUnique({ where: { id: req.params.accountId }, include: { workspace: true } });
    if (!account || !account.workspace.active) return res.status(404).json({ error: 'Conta social ou projeto não encontrado.' });
    const authorizationUrl = await createSocialAuthorizationUrl(account.id);
    res.json({ authorizationUrl, platform: account.platform, expiresInSeconds: 600, message: 'Abra a URL e autorize somente as permissões necessárias.' });
  } catch (error: any) {
    res.status(400).json({ error: String(error?.message || 'Não foi possível iniciar OAuth.').slice(0, 400) });
  }
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
  const count = Math.min(30, Math.max(1, Number(req.body?.count) || 30));
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.chat.completions.create({
    model: process.env.SOCIAL_MEDIA_AI_MODEL || 'gpt-4.1-mini',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: 'Você é estrategista de redes sociais em português brasileiro. Gere conteúdo original, útil, sem alegações não verificadas, sem hashtags excessivas. Se a quantidade for múltipla de 6, distribua igualmente entre as seis plataformas, evitando duplicação literal. Retorne JSON {"posts":[{"platform":"INSTAGRAM|FACEBOOK|TIKTOK|YOUTUBE|GOOGLE_BUSINESS|PINTEREST","title":"...","caption":"...","hashtags":["..."],"contentType":"IMAGE|VIDEO|TEXT"}]}. Alterne plataformas e adapte tamanho/formato ao canal. Não invente fatos sobre a empresa.' },
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
  const existing = await prisma.socialPost.findUnique({ where: { id: req.params.postId } });
  if (!existing) return res.status(404).json({ error: 'Publicação não encontrada.' });
  let metadata: Record<string, any> = {};
  try { metadata = JSON.parse(existing.metadata || '{}'); } catch {}
  if (existing.platform === 'TIKTOK') {
    if (req.body?.tiktokConsent !== true) return res.status(400).json({ error: 'TikTok exige confirmação explícita para enviar este conteúdo à conta autorizada.' });
    metadata.tiktokConsentAt = new Date().toISOString();
  }
  const post = await prisma.socialPost.update({ where: { id: req.params.postId }, data: { scheduledFor, status: 'SCHEDULED', lastError: null, metadata: JSON.stringify(metadata) } });
  res.json({ post });
});

router.post('/posts/:postId/publish', async (req, res) => {
  const post = await prisma.socialPost.findUnique({ where: { id: req.params.postId } });
  if (!post) return res.status(404).json({ error: 'Publicação não encontrada.' });
  if (post.status === 'PUBLISHED') return res.status(409).json({ error: 'Esta publicação já foi enviada.', post });
  const result = await publishQueuedSocialPost(post.id);
  if (!result.accepted) return res.status(409).json(result);
  res.json({ ...result, message: result.message || 'Solicitação processada.' });
});

router.get('/posts/:postId/logs', async (req, res) => {
  const logs = await prisma.socialPublishLog.findMany({ where: { postId: req.params.postId }, orderBy: { createdAt: 'desc' }, take: 100 });
  res.json({ logs });
});

export default router;
