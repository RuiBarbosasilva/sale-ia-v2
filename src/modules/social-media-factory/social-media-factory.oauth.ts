import crypto from 'node:crypto';
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
export const socialOAuthCallbackRouter = Router();

type Platform = 'INSTAGRAM' | 'FACEBOOK' | 'TIKTOK' | 'YOUTUBE' | 'GOOGLE_BUSINESS' | 'PINTEREST';
type ProviderConfig = { clientId: string; clientSecret: string; authorizeUrl: string; tokenUrl: string; scopes: string[]; style: 'query' | 'form' | 'basic-form' };

function envRequired(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Configuração ausente: ${name}`);
  return value;
}
function callbackUri(): string {
  return envRequired('SOCIAL_MEDIA_OAUTH_REDIRECT_URI');
}
function metaVersion(): string {
  return process.env.META_GRAPH_API_VERSION || 'v23.0';
}
function providerConfig(platform: Platform): ProviderConfig {
  if (platform === 'FACEBOOK' || platform === 'INSTAGRAM') return {
    clientId: envRequired('META_APP_ID'), clientSecret: envRequired('META_APP_SECRET'),
    authorizeUrl: 'https://www.facebook.com/' + metaVersion() + '/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/' + metaVersion() + '/oauth/access_token',
    scopes: ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts', 'instagram_basic', 'instagram_content_publish', 'business_management'],
    style: 'query'
  };
  if (platform === 'TIKTOK') return {
    clientId: envRequired('TIKTOK_CLIENT_KEY'), clientSecret: envRequired('TIKTOK_CLIENT_SECRET'),
    authorizeUrl: 'https://www.tiktok.com/v2/auth/authorize/',
    tokenUrl: 'https://open.tiktokapis.com/v2/oauth/token/',
    scopes: ['user.info.basic', 'video.publish', 'video.upload'],
    style: 'form'
  };
  if (platform === 'YOUTUBE' || platform === 'GOOGLE_BUSINESS') return {
    clientId: envRequired('GOOGLE_CLIENT_ID'), clientSecret: envRequired('GOOGLE_CLIENT_SECRET'),
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: platform === 'YOUTUBE'
      ? ['openid', 'email', 'https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/youtube.readonly']
      : ['openid', 'email', 'https://www.googleapis.com/auth/business.manage'],
    style: 'form'
  };
  return {
    clientId: envRequired('PINTEREST_APP_ID'), clientSecret: envRequired('PINTEREST_APP_SECRET'),
    authorizeUrl: 'https://www.pinterest.com/oauth/',
    tokenUrl: 'https://api.pinterest.com/v5/oauth/token',
    scopes: ['user_accounts:read', 'boards:read', 'pins:read', 'pins:write'],
    style: 'basic-form'
  };
}
function encryptionKey(): Buffer {
  const raw = envRequired('SOCIAL_MEDIA_TOKEN_ENCRYPTION_KEY');
  const key = /^[0-9a-f]{64}$/i.test(raw) ? Buffer.from(raw, 'hex') : Buffer.from(raw, 'base64');
  if (key.length !== 32) throw new Error('SOCIAL_MEDIA_TOKEN_ENCRYPTION_KEY deve ser uma chave de 32 bytes em hexadecimal (64 caracteres) ou Base64.');
  return key;
}
export function encryptSocialSecret(value: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ['v1', iv.toString('base64'), tag.toString('base64'), encrypted.toString('base64')].join('.');
}
export function decryptSocialSecret(value: string): string {
  const [version, ivB64, tagB64, bodyB64] = value.split('.');
  if (version !== 'v1' || !ivB64 || !tagB64 || !bodyB64) throw new Error('Formato de credencial criptografada inválido.');
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(bodyB64, 'base64')), decipher.final()]).toString('utf8');
}
async function fetchJson(url: string, init?: RequestInit): Promise<any> {
  const response = await fetch(url, init);
  const raw = await response.text();
  let data: any;
  try { data = raw ? JSON.parse(raw) : {}; } catch { data = { message: raw.slice(0, 500) }; }
  if (!response.ok) throw new Error(`OAuth provider returned HTTP ${response.status}: ${String(data.error_description || data.error?.message || data.error || data.message || 'request failed').slice(0, 350)}`);
  if (data.error && data.error.code && data.error.code !== 'ok') throw new Error(String(data.error.message || data.error.code).slice(0, 350));
  return data;
}

export async function createSocialAuthorizationUrl(accountId: string): Promise<string> {
  const account = await prisma.socialAccount.findUnique({ where: { id: accountId }, include: { workspace: true } });
  if (!account || !account.workspace.active) throw new Error('Conta social ou projeto ativo não encontrado.');
  const platform = account.platform as Platform;
  const config = providerConfig(platform);
  const state = crypto.randomBytes(32).toString('base64url');
  await prisma.socialOAuthState.create({ data: { state, accountId: account.id, expiresAt: new Date(Date.now() + 10 * 60 * 1000) } });
  const url = new URL(config.authorizeUrl);
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('redirect_uri', callbackUri());
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('state', state);
  url.searchParams.set('scope', config.scopes.join(config.style === 'query' ? ',' : ' '));
  if (platform === 'YOUTUBE' || platform === 'GOOGLE_BUSINESS') {
    url.searchParams.set('access_type', 'offline');
    url.searchParams.set('include_granted_scopes', 'true');
    url.searchParams.set('prompt', 'consent');
  }
  if (platform === 'TIKTOK') url.searchParams.set('client_key', config.clientId);
  if (platform === 'PINTEREST') url.searchParams.set('response_type', 'code');
  return url.toString();
}

async function exchangeCode(platform: Platform, code: string): Promise<any> {
  const config = providerConfig(platform);
  const redirect_uri = callbackUri();
  if (platform === 'FACEBOOK' || platform === 'INSTAGRAM') {
    const url = new URL(config.tokenUrl);
    url.searchParams.set('client_id', config.clientId);
    url.searchParams.set('client_secret', config.clientSecret);
    url.searchParams.set('redirect_uri', redirect_uri);
    url.searchParams.set('code', code);
    return fetchJson(url.toString());
  }
  if (config.style === 'basic-form') {
    const body = new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri });
    return fetchJson(config.tokenUrl, { method: 'POST', headers: { Authorization: 'Basic ' + Buffer.from(config.clientId + ':' + config.clientSecret).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  }
  if (platform === 'TIKTOK') {
    const body = new URLSearchParams({ client_key: config.clientId, client_secret: config.clientSecret, code, grant_type: 'authorization_code', redirect_uri });
    return fetchJson(config.tokenUrl, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  }
  const body = new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret, code, grant_type: 'authorization_code', redirect_uri });
  return fetchJson(config.tokenUrl, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
}

async function fetchMetaPages(accessToken: string): Promise<any[]> {
  const version = metaVersion();
  const url = new URL(`https://graph.facebook.com/${version}/me/accounts`);
  url.searchParams.set('fields', 'id,name,access_token,instagram_business_account{id,username}');
  url.searchParams.set('access_token', accessToken);
  const result = await fetchJson(url.toString());
  return Array.isArray(result.data) ? result.data : [];
}
async function fetchIdentity(platform: Platform, token: string): Promise<{ id?: string; name?: string }> {
  if (platform === 'FACEBOOK' || platform === 'INSTAGRAM') {
    const url = new URL(`https://graph.facebook.com/${metaVersion()}/me`);
    url.searchParams.set('fields', 'id,name');
    url.searchParams.set('access_token', token);
    return fetchJson(url.toString());
  }
  if (platform === 'TIKTOK') {
    const result = await fetchJson('https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,username', { headers: { Authorization: 'Bearer ' + token } });
    return { id: result.data?.user?.open_id, name: result.data?.user?.display_name || result.data?.user?.username };
  }
  if (platform === 'YOUTUBE') {
    const url = new URL('https://www.googleapis.com/youtube/v3/channels');
    url.searchParams.set('part', 'id,snippet');
    url.searchParams.set('mine', 'true');
    const result = await fetchJson(url.toString(), { headers: { Authorization: 'Bearer ' + token } });
    const channel = result.items?.[0];
    return { id: channel?.id, name: channel?.snippet?.title };
  }
  if (platform === 'PINTEREST') {
    const result = await fetchJson('https://api.pinterest.com/v5/user_account', { headers: { Authorization: 'Bearer ' + token } });
    return { id: result.username, name: result.username };
  }
  return {};
}
async function upsertAccount(input: { workspaceId: string; platform: Platform; externalId: string; accountName?: string; accessToken: string; refreshToken?: string; expiresAt?: Date; scopes: string[] }) {
  const where = { workspaceId_platform_externalId: { workspaceId: input.workspaceId, platform: input.platform, externalId: input.externalId } };
  const data = {
    accountName: input.accountName || input.externalId,
    status: 'CONNECTED',
    accessTokenEncrypted: encryptSocialSecret(input.accessToken),
    refreshTokenEncrypted: input.refreshToken ? encryptSocialSecret(input.refreshToken) : undefined,
    tokenExpiresAt: input.expiresAt,
    scopes: JSON.stringify(input.scopes),
    lastCheckedAt: new Date(),
    lastError: null
  };
  await prisma.socialAccount.upsert({ where, create: { workspaceId: input.workspaceId, platform: input.platform, externalId: input.externalId, ...data }, update: data });
}

socialOAuthCallbackRouter.get('/callback', async (req, res) => {
  const stateValue = String(req.query.state || '');
  const code = String(req.query.code || '');
  const providerError = String(req.query.error_description || req.query.error || '');
  let stateRecord: any;
  try {
    if (!stateValue) throw new Error('Parâmetro OAuth state ausente.');
    stateRecord = await prisma.socialOAuthState.findUnique({ where: { state: stateValue }, include: { account: { include: { workspace: true } } } });
    if (!stateRecord || stateRecord.consumedAt || stateRecord.expiresAt <= new Date()) throw new Error('Estado OAuth inválido, expirado ou já utilizado.');
    const consumed = await prisma.socialOAuthState.updateMany({ where: { id: stateRecord.id, consumedAt: null, expiresAt: { gt: new Date() } }, data: { consumedAt: new Date() } });
    if (!consumed.count) throw new Error('Estado OAuth já utilizado.');
    if (providerError) throw new Error('Autorização cancelada pelo provedor: ' + providerError.slice(0, 180));
    if (!code) throw new Error('Código de autorização não recebido.');
    const account = stateRecord.account;
    const platform = account.platform as Platform;
    const tokens = await exchangeCode(platform, code);
    const accessToken = String(tokens.access_token || '');
    if (!accessToken) throw new Error('O provedor não retornou token de acesso.');
    const refreshToken = tokens.refresh_token ? String(tokens.refresh_token) : undefined;
    const expiresIn = Number(tokens.expires_in || 0);
    const expiresAt = expiresIn > 0 ? new Date(Date.now() + expiresIn * 1000) : undefined;
    const scopeString = String(tokens.scope || '');
    const scopes = scopeString ? scopeString.split(/[ ,]+/).filter(Boolean) : providerConfig(platform).scopes;

    if (platform === 'FACEBOOK' || platform === 'INSTAGRAM') {
      const pages = await fetchMetaPages(accessToken);
      if (!pages.length) {
        const identity = await fetchIdentity(platform, accessToken);
        if (identity.id) await upsertAccount({ workspaceId: account.workspaceId, platform, externalId: identity.id, accountName: identity.name, accessToken, refreshToken, expiresAt, scopes });
      } else {
        for (const page of pages) {
          if (platform === 'FACEBOOK' && page.id && page.access_token) await upsertAccount({ workspaceId: account.workspaceId, platform: 'FACEBOOK', externalId: String(page.id), accountName: String(page.name || page.id), accessToken: String(page.access_token), refreshToken, expiresAt, scopes });
          if (platform === 'INSTAGRAM' && page.instagram_business_account?.id && page.access_token) await upsertAccount({ workspaceId: account.workspaceId, platform: 'INSTAGRAM', externalId: String(page.instagram_business_account.id), accountName: String(page.instagram_business_account.username || page.name || page.id), accessToken: String(page.access_token), refreshToken, expiresAt, scopes });
        }
      }
      await prisma.socialAccount.update({ where: { id: account.id }, data: { status: 'AUTHORIZED', lastCheckedAt: new Date(), lastError: null, scopes: JSON.stringify(scopes) } });
    } else {
      const identity = await fetchIdentity(platform, accessToken);
      const externalId = identity.id || account.externalId || account.id;
      await upsertAccount({ workspaceId: account.workspaceId, platform, externalId, accountName: identity.name || account.accountName || externalId, accessToken, refreshToken, expiresAt, scopes });
      await prisma.socialAccount.update({ where: { id: account.id }, data: { status: 'CONNECTED', externalId, accountName: identity.name || account.accountName, accessTokenEncrypted: encryptSocialSecret(accessToken), refreshTokenEncrypted: refreshToken ? encryptSocialSecret(refreshToken) : null, tokenExpiresAt: expiresAt, scopes: JSON.stringify(scopes), lastCheckedAt: new Date(), lastError: null } });
    }
    return res.redirect('/social-media-factory?oauth=success&platform=' + encodeURIComponent(platform));
  } catch (error: any) {
    if (stateRecord?.accountId) {
      await prisma.socialAccount.update({ where: { id: stateRecord.accountId }, data: { status: 'ERROR', lastError: String(error?.message || 'OAuth error').slice(0, 500), lastCheckedAt: new Date() } }).catch(() => undefined);
    }
    return res.redirect('/social-media-factory?oauth=error');
  }
});

export function socialOAuthConfigurationStatus() {
  const configured = (names: string[]) => names.every(name => Boolean(process.env[name]?.trim()));
  return {
    META: configured(['META_APP_ID', 'META_APP_SECRET']),
    TIKTOK: configured(['TIKTOK_CLIENT_KEY', 'TIKTOK_CLIENT_SECRET']),
    GOOGLE: configured(['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET']),
    PINTEREST: configured(['PINTEREST_APP_ID', 'PINTEREST_APP_SECRET']),
    callbackConfigured: Boolean(process.env.SOCIAL_MEDIA_OAUTH_REDIRECT_URI?.trim()),
    encryptionConfigured: Boolean(process.env.SOCIAL_MEDIA_TOKEN_ENCRYPTION_KEY?.trim())
  };
}
