import { PrismaClient, SocialPost, SocialAccount } from '@prisma/client';
import { getValidSocialAccessToken } from './social-media-factory.oauth';

const prisma = new PrismaClient();
const GRAPH_VERSION = process.env.META_GRAPH_API_VERSION || 'v23.0';
type PublishResult = { status: 'PUBLISHED' | 'PROCESSING'; externalPostId?: string; publishedUrl?: string; message: string };

function parseMedia(post: SocialPost): string[] {
  if (!post.mediaUrls) return [];
  try {
    const parsed = JSON.parse(post.mediaUrls);
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
  } catch { return []; }
}
function assertPublicHttps(value: string): URL {
  const url = new URL(value);
  if (url.protocol !== 'https:') throw new Error('A mídia precisa usar URL HTTPS pública.');
  const host = url.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') ||
      /^(127\.|10\.|192\.168\.|169\.254\.)/.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host) || host === '::1' || host.startsWith('fc') || host.startsWith('fd')) {
    throw new Error('URL de mídia local/privada não permitida.');
  }
  return url;
}
async function requestJson(url: string, init?: RequestInit): Promise<any> {
  const response = await fetch(url, init);
  const raw = await response.text();
  let body: any;
  try { body = raw ? JSON.parse(raw) : {}; } catch { body = { message: raw.slice(0, 300) }; }
  if (!response.ok) {
    const detail = body?.error?.message || body?.error_description || body?.message || `HTTP ${response.status}`;
    throw new Error(String(detail).slice(0, 400));
  }
  if (body?.error && body.error.code && body.error.code !== 'ok') throw new Error(String(body.error.message || body.error.code).slice(0, 400));
  return body;
}
async function tokenFor(account: SocialAccount): Promise<string> {
  return getValidSocialAccessToken(account);
}
function accountMetadata(account: SocialAccount): Record<string, any> {
  try { return JSON.parse(account.platformMetadata || '{}'); } catch { return {}; }
}
function titleOf(post: SocialPost): string {
  return (post.title || post.caption.split('\n')[0] || 'Publicação').slice(0, 100);
}
async function publishFacebook(post: SocialPost, account: SocialAccount, token: string): Promise<PublishResult> {
  if (!account.externalId) throw new Error('Selecione uma Página do Facebook para esta conta.');
  const base = `https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(account.externalId)}`;
  const media = parseMedia(post)[0];
  const form = new URLSearchParams({ access_token: token, message: post.caption + (post.hashtags ? '\n' + post.hashtags : '') });
  let endpoint = base + '/feed';
  if (media) { assertPublicHttps(media); endpoint = base + '/photos'; form.set('url', media); form.set('caption', form.get('message') || ''); form.delete('message'); }
  const result = await requestJson(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form });
  return { status: 'PUBLISHED', externalPostId: String(result.post_id || result.id || ''), publishedUrl: result.post_id ? `https://www.facebook.com/${result.post_id}` : undefined, message: 'Publicado na Página do Facebook.' };
}
async function publishInstagram(post: SocialPost, account: SocialAccount, token: string): Promise<PublishResult> {
  if (!account.externalId) throw new Error('Conta Instagram profissional não identificada.');
  const media = parseMedia(post)[0];
  if (!media) throw new Error('Instagram exige URL HTTPS pública de imagem ou vídeo para esta publicação.');
  const mediaUrl = assertPublicHttps(media).toString();
  const base = `https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(account.externalId)}`;
  const isVideo = post.contentType.toUpperCase() === 'VIDEO' || post.contentType.toUpperCase() === 'REEL';
  const create = new URLSearchParams({ access_token: token, caption: post.caption + (post.hashtags ? '\n' + post.hashtags : '') });
  if (isVideo) { create.set('media_type', 'REELS'); create.set('video_url', mediaUrl); }
  else create.set('image_url', mediaUrl);
  const container = await requestJson(base + '/media', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: create });
  if (!container.id) throw new Error('Instagram não retornou o ID do contêiner de mídia.');
  const publish = await requestJson(base + '/media_publish', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ creation_id: String(container.id), access_token: token }) });
  return { status: 'PUBLISHED', externalPostId: String(publish.id || ''), publishedUrl: undefined, message: 'Publicado no Instagram.' };
}
async function publishTikTok(post: SocialPost, account: SocialAccount, token: string): Promise<PublishResult> {
  const media = parseMedia(post);
  if (!media.length) throw new Error('TikTok exige pelo menos uma URL HTTPS pública de mídia.');
  media.forEach(assertPublicHttps);
  const info = await requestJson('https://open.tiktokapis.com/v2/post/publish/creator_info/query/', { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: '{}' });
  const options: string[] = info.data?.privacy_level_options || [];
  const privacy = options.includes('PUBLIC_TO_EVERYONE') ? 'PUBLIC_TO_EVERYONE' : options[0];
  if (!privacy) throw new Error('TikTok não retornou opções de privacidade para a conta.');
  const isPhoto = post.contentType.toUpperCase() === 'IMAGE' || post.contentType.toUpperCase() === 'PHOTO' || post.contentType.toUpperCase() === 'CAROUSEL';
  const endpoint = isPhoto ? 'https://open.tiktokapis.com/v2/post/publish/content/init/' : 'https://open.tiktokapis.com/v2/post/publish/video/init/';
  const payload = isPhoto ? {
    post_info: { title: post.caption.slice(0, 2200), description: post.caption, privacy_level: privacy, is_aigc: true },
    source_info: { source: 'PULL_FROM_URL', photo_images: media.slice(0, 10), photo_cover_index: 0 },
    post_mode: 'DIRECT_POST', media_type: 'PHOTO'
  } : {
    post_info: { title: post.caption.slice(0, 2200), privacy_level: privacy, is_aigc: true },
    source_info: { source: 'PULL_FROM_URL', video_url: media[0] }
  };
  const result = await requestJson(endpoint, { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json; charset=UTF-8' }, body: JSON.stringify(payload) });
  const publishId = result.data?.publish_id;
  if (!publishId) throw new Error('TikTok não retornou o identificador de publicação.');
  return { status: 'PROCESSING', externalPostId: String(publishId), message: 'TikTok aceitou o envio; aguardando confirmação de processamento.' };
}
async function publishGoogleBusiness(post: SocialPost, account: SocialAccount, token: string): Promise<PublishResult> {
  const parent = String(account.externalId || '');
  if (!/^accounts\/[^/]+\/locations\/[^/]+$/.test(parent)) throw new Error('Configure o destino Google Business no formato accounts/{accountId}/locations/{locationId}.');
  const media = parseMedia(post);
  const payload: any = { languageCode: 'pt-BR', summary: post.caption.slice(0, 1500), topicType: 'STANDARD' };
  if (media[0]) { payload.media = [{ mediaFormat: 'PHOTO', sourceUrl: assertPublicHttps(media[0]).toString() }]; }
  if (post.linkUrl) payload.callToAction = { actionType: 'LEARN_MORE', url: post.linkUrl };
  const result = await requestJson(`https://mybusiness.googleapis.com/v4/${parent}/localPosts`, { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  return { status: 'PUBLISHED', externalPostId: String(result.name || result.localPostId || ''), publishedUrl: result.searchUrl, message: 'Publicação criada no Google Business Profile.' };
}
async function publishPinterest(post: SocialPost, account: SocialAccount, token: string): Promise<PublishResult> {
  const boardId = String(accountMetadata(account).boardId || '');
  if (!boardId) throw new Error('Configure boardId em platformMetadata para a conta Pinterest.');
  const media = parseMedia(post)[0];
  if (!media) throw new Error('Pinterest exige uma imagem HTTPS pública.');
  const payload: any = { board_id: boardId, title: titleOf(post), description: post.caption, media_source: { source_type: 'image_url', url: assertPublicHttps(media).toString() } };
  if (post.linkUrl) payload.link = post.linkUrl;
  const result = await requestJson('https://api.pinterest.com/v5/pins', { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  return { status: 'PUBLISHED', externalPostId: String(result.id || ''), publishedUrl: result.id ? `https://www.pinterest.com/pin/${result.id}/` : undefined, message: 'Pin criado no Pinterest.' };
}
async function publishYouTube(post: SocialPost, account: SocialAccount, token: string): Promise<PublishResult> {
  const media = parseMedia(post)[0];
  if (!media) throw new Error('YouTube exige URL pública de vídeo.');
  const mediaUrl = assertPublicHttps(media);
  const allowedHosts = (process.env.SOCIAL_MEDIA_MEDIA_ALLOWED_HOSTS || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
  if (!allowedHosts.includes(mediaUrl.hostname.toLowerCase())) throw new Error('Por segurança, o host da mídia precisa estar em SOCIAL_MEDIA_MEDIA_ALLOWED_HOSTS antes do upload para YouTube.');
  const mediaResponse = await fetch(mediaUrl.toString());
  if (!mediaResponse.ok) throw new Error(`Não foi possível obter o vídeo para YouTube (HTTP ${mediaResponse.status}).`);
  const contentType = mediaResponse.headers.get('content-type') || 'video/mp4';
  if (!contentType.startsWith('video/')) throw new Error('O recurso informado não foi reconhecido como vídeo.');
  const contentLength = Number(mediaResponse.headers.get('content-length') || 0);
  const maxBytes = Number(process.env.SOCIAL_MEDIA_YOUTUBE_MAX_BYTES || 524288000);
  if (contentLength && contentLength > maxBytes) throw new Error('O vídeo excede o limite configurado para upload do YouTube.');
  const bytes = Buffer.from(await mediaResponse.arrayBuffer());
  if (bytes.length > maxBytes) throw new Error('O vídeo excede o limite configurado para upload do YouTube.');
  const metadata = { snippet: { title: titleOf(post), description: post.caption, tags: (post.hashtags || '').split(/\s+/).filter(tag => tag.startsWith('#')).map(tag => tag.slice(1)).slice(0, 30), categoryId: '22' }, status: { privacyStatus: process.env.SOCIAL_MEDIA_YOUTUBE_PRIVACY || 'private', containsSyntheticMedia: true } };
  const initUrl = new URL('https://www.googleapis.com/upload/youtube/v3/videos');
  initUrl.searchParams.set('uploadType', 'resumable');
  initUrl.searchParams.set('part', 'snippet,status');
  const init = await fetch(initUrl.toString(), { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json; charset=UTF-8', 'X-Upload-Content-Type': contentType, 'X-Upload-Content-Length': String(bytes.length) }, body: JSON.stringify(metadata) });
  if (!init.ok) throw new Error(`YouTube não iniciou o upload (HTTP ${init.status}).`);
  const uploadUrl = init.headers.get('location');
  if (!uploadUrl || !uploadUrl.startsWith('https://www.googleapis.com/upload/youtube/')) throw new Error('YouTube não retornou URL de upload válida.');
  const uploaded = await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': contentType, 'Content-Length': String(bytes.length) }, body: bytes as any });
  const result = await uploaded.json().catch(() => ({} as any));
  if (!uploaded.ok) throw new Error(String(result?.error?.message || `YouTube upload falhou (HTTP ${uploaded.status}).`));
  return { status: 'PUBLISHED', externalPostId: String(result.id || ''), publishedUrl: result.id ? `https://www.youtube.com/watch?v=${result.id}` : undefined, message: 'Vídeo enviado ao YouTube; a visibilidade depende da auditoria do projeto Google e das configurações do canal.' };
}

export async function publishSocialPost(postId: string): Promise<PublishResult> {
  const post = await prisma.socialPost.findUnique({ where: { id: postId }, include: { workspace: true } });
  if (!post || !post.workspace.active) throw new Error('Post ou projeto ativo não encontrado.');
  const accounts = await prisma.socialAccount.findMany({
    where: { workspaceId: post.workspaceId, platform: post.platform, status: { in: ['CONNECTED', 'AUTHORIZED'] }, accessTokenEncrypted: { not: null } },
    orderBy: { updatedAt: 'desc' }
  });
  if (!accounts.length) throw new Error(`Nenhuma conta ${post.platform} autorizada para este projeto.`);
  if (accounts.length > 1) throw new Error(`Há ${accounts.length} contas ${post.platform} conectadas neste projeto. Selecione explicitamente a conta de destino antes de publicar.`);
  const account = accounts[0];
  const token = await tokenFor(account);
  switch (post.platform) {
    case 'FACEBOOK': return publishFacebook(post, account, token);
    case 'INSTAGRAM': return publishInstagram(post, account, token);
    case 'TIKTOK': return publishTikTok(post, account, token);
    case 'GOOGLE_BUSINESS': return publishGoogleBusiness(post, account, token);
    case 'PINTEREST': return publishPinterest(post, account, token);
    case 'YOUTUBE': return publishYouTube(post, account, token);
    default: throw new Error(`Plataforma não suportada: ${post.platform}`);
  }
}

export async function checkSocialPostProcessing(postId: string): Promise<'PUBLISHED' | 'PROCESSING' | 'FAILED'> {
  const post = await prisma.socialPost.findUnique({ where: { id: postId }, include: { workspace: true } });
  if (!post || !post.externalPostId) return 'FAILED';
  const accounts = await prisma.socialAccount.findMany({ where: { workspaceId: post.workspaceId, platform: post.platform, status: { in: ['CONNECTED', 'AUTHORIZED'] }, accessTokenEncrypted: { not: null } }, orderBy: { updatedAt: 'desc' } });
  if (accounts.length !== 1) return 'FAILED';
  const account = accounts[0];
  if (post.platform !== 'TIKTOK') return post.status === 'PUBLISHED' ? 'PUBLISHED' : 'FAILED';
  const result = await requestJson('https://open.tiktokapis.com/v2/post/publish/status/fetch/', { method: 'POST', headers: { Authorization: 'Bearer ' + await tokenFor(account), 'Content-Type': 'application/json' }, body: JSON.stringify({ publish_id: post.externalPostId }) });
  const status = String(result.data?.status || '').toUpperCase();
  if (['PUBLISH_COMPLETE', 'PUBLISHED'].includes(status)) return 'PUBLISHED';
  if (['FAILED', 'PUBLISH_FAILED'].includes(status)) return 'FAILED';
  return 'PROCESSING';
}
