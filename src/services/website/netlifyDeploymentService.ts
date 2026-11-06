import axios from 'axios';
import path from 'path';
import { lookup } from 'dns/promises';
import { isIP } from 'net';

const NETLIFY_API = 'https://api.netlify.com/api/v1';

type NetlifySite = {
  id?: string;
  name?: string;
  url?: string;
  ssl_url?: string;
  custom_domain?: string | null;
};

type NetlifyDeploy = {
  id?: string;
  state?: string;
  deploy_url?: string;
  ssl_url?: string;
  url?: string;
  error?: string;
};

function token(): string {
  return String(process.env.NETLIFY_AUTH_TOKEN || '').trim();
}

function authHeaders(extra: Record<string, string> = {}) {
  const value = token();
  if (!value) throw new Error('NETLIFY_NOT_CONFIGURED');
  return {
    Authorization: 'Bearer ' + value,
    'User-Agent': 'Sale-IA-RB-Factory/1.0',
    ...extra,
  };
}

function normalizeUrl(value?: string | null): string | null {
  const raw = String(value || '').trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  return 'https://' + raw;
}

function siteSlug(companyName: string, projectId: string): string {
  const base = String(companyName || 'site')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 35) || 'site';
  return ('rb-' + base + '-' + projectId.slice(0, 8)).slice(0, 50);
}

async function createSite(name: string, customDomain?: string): Promise<NetlifySite> {
  const body: Record<string, any> = {
    name,
    force_ssl: true,
    processing_settings: { html: { pretty_urls: true } }
  };
  if (customDomain) body.custom_domain = customDomain;
  const response = await axios.post<NetlifySite>(NETLIFY_API + '/sites', body, {
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    timeout: 30000,
  });
  return response.data;
}

async function findSiteByName(name: string): Promise<NetlifySite | null> {
  const response = await axios.get<NetlifySite[]>(NETLIFY_API + '/sites', {
    params: { name },
    headers: authHeaders(),
    timeout: 30000,
  });
  const sites = Array.isArray(response.data) ? response.data : [];
  return sites.find(site => String(site.name || '') === name) || null;
}

async function updateSite(siteId: string, customDomain?: string): Promise<NetlifySite> {
  const body: Record<string, any> = {};
  if (customDomain) body.custom_domain = customDomain;
  if (!Object.keys(body).length) return getSite(siteId);
  const response = await axios.patch<NetlifySite>(
    NETLIFY_API + '/sites/' + encodeURIComponent(siteId),
    body,
    {
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      timeout: 30000,
    }
  );
  return response.data;
}

async function getSite(siteId: string): Promise<NetlifySite> {
  const response = await axios.get<NetlifySite>(NETLIFY_API + '/sites/' + encodeURIComponent(siteId), {
    headers: authHeaders(),
    timeout: 30000,
  });
  return response.data;
}

async function deployZip(siteId: string, zip: Buffer): Promise<NetlifyDeploy> {
  const response = await axios.post<NetlifyDeploy>(
    NETLIFY_API + '/sites/' + encodeURIComponent(siteId) + '/deploys',
    zip,
    {
      headers: authHeaders({ 'Content-Type': 'application/zip' }),
      timeout: 120000,
      maxContentLength: 25 * 1024 * 1024,
      maxBodyLength: 25 * 1024 * 1024,
    }
  );
  return response.data;
}

async function waitForReady(deployId: string, maxAttempts = 20): Promise<NetlifyDeploy> {
  let last: NetlifyDeploy = { id: deployId, state: 'unknown' };
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await axios.get<NetlifyDeploy>(NETLIFY_API + '/deploys/' + encodeURIComponent(deployId), {
      headers: authHeaders(),
      timeout: 30000,
    });
    last = response.data;
    if (last.state === 'ready') return last;
    if (['error', 'retrying'].includes(String(last.state || '').toLowerCase())) {
      throw new Error('NETLIFY_DEPLOY_FAILED:' + (last.error || last.state));
    }
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
  throw new Error('NETLIFY_DEPLOY_TIMEOUT:' + (last.state || 'unknown'));
}

async function verifyPublicUrl(url: string, maxAttempts = 10): Promise<void> {
  let lastStatus = 0;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await axios.get(url, {
        timeout: 12000,
        maxRedirects: 5,
        validateStatus: status => status >= 200 && status < 400,
        headers: { 'User-Agent': 'Sale-IA-RB-Factory/1.0' },
      });
      if (response.status >= 200 && response.status < 400) return;
      lastStatus = response.status;
    } catch (error: any) {
      lastStatus = Number(error?.response?.status || 0);
    }
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  throw new Error('NETLIFY_PUBLIC_URL_VERIFICATION_FAILED:' + (lastStatus || 'unreachable'));
}

export const netlifyDeploymentService = {
  isConfigured(): boolean {
    return Boolean(token());
  },

  async deployStaticSite(input: {
    projectId: string;
    companyName: string;
    html: string;
    assets?: any[];
    customDomain?: string;
    existingSiteId?: string | null;
  }) {
    if (!token()) throw new Error('NETLIFY_NOT_CONFIGURED');
    if (!input.projectId || !input.html) throw new Error('NETLIFY_INVALID_DEPLOYMENT');

    let site: NetlifySite;
    const customDomain = String(input.customDomain || '').trim()
      .replace(/^https?:\/\//i, '')
      .replace(/\/.*$/, '')
      .replace(/\/$/, '');

    if (input.existingSiteId) {
      site = await getSite(input.existingSiteId);
      if (customDomain && site.custom_domain !== customDomain) {
        site = await updateSite(site.id || input.existingSiteId, customDomain);
      }
    } else {
      const desiredName = siteSlug(input.companyName, input.projectId);
      site = await findSiteByName(desiredName) || await createSite(desiredName, customDomain || undefined);
      if (customDomain && site.custom_domain !== customDomain) {
        site = await updateSite(site.id || '', customDomain);
      }
    }

    if (!site.id) throw new Error('NETLIFY_SITE_ID_MISSING');

    const localized = await localizeAssets(input.html, Array.isArray(input.assets) ? input.assets : []);
    const zip = buildStaticZip(localized.html, input.companyName, input.projectId, localized.files);
    if (zip.length > 24 * 1024 * 1024) {
      throw new Error('NETLIFY_DEPLOY_TOO_LARGE');
    }
    const deploy = await deployZip(site.id, zip);
    if (!deploy.id) throw new Error('NETLIFY_DEPLOY_ID_MISSING');

    const ready = await waitForReady(deploy.id);
    const publicUrl = normalizeUrl(
      site.custom_domain || ready.ssl_url || ready.deploy_url || site.ssl_url || site.url
    );
    if (!publicUrl) throw new Error('NETLIFY_PUBLIC_URL_MISSING');
    const verificationUrl = normalizeUrl(ready.deploy_url || ready.ssl_url || publicUrl) || publicUrl;
    await verifyPublicUrl(verificationUrl);

    return {
      siteId: site.id,
      siteName: site.name || null,
      deployId: ready.id || deploy.id,
      state: ready.state,
      publicUrl,
      deployUrl: normalizeUrl(ready.deploy_url),
      siteUrl: normalizeUrl(site.url),
    };
  }
};

function isPrivateAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) {
    const parts = address.split('.').map(Number);
    const [a, b] = parts;
    return a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19));
  }
  if (version === 6) {
    const normalized = address.toLowerCase();
    return normalized === '::' || normalized === '::1' ||
      normalized.startsWith('fc') || normalized.startsWith('fd') ||
      normalized.startsWith('fe8') || normalized.startsWith('fe9') ||
      normalized.startsWith('fea') || normalized.startsWith('feb') ||
      normalized.startsWith('::ffff:') && isPrivateAddress(normalized.slice(7));
  }
  return true;
}

async function isSafePublicAssetUrl(value: string): Promise<boolean> {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:' || !parsed.hostname ||
        parsed.username || parsed.password ||
        parsed.hostname === 'localhost' ||
        parsed.hostname.endsWith('.localhost') ||
        parsed.hostname.endsWith('.local')) return false;

    const addresses = isIP(parsed.hostname)
      ? [{ address: parsed.hostname }]
      : await lookup(parsed.hostname, { all: true, verbatim: true });
    return addresses.length > 0 && addresses.every(entry => !isPrivateAddress(entry.address));
  } catch {
    return false;
  }
}

async function localizeAssets(html: string, assets: any[]): Promise<{ html: string; files: Array<{ name: string; content: Buffer }> }> {
  let localizedHtml = html;
  const files: Array<{ name: string; content: Buffer }> = [];
  const seen = new Set<string>();

  for (let index = 0; index < assets.length && files.length < 40; index++) {
    const asset = assets[index] || {};
    const sourceUrl = String(asset.sourceUrl || asset.url || asset.imageUrl || '').trim();
    if (seen.has(sourceUrl) || !(await isSafePublicAssetUrl(sourceUrl))) continue;
    seen.add(sourceUrl);

    try {
      const response = await axios.get<ArrayBuffer>(sourceUrl, {
        responseType: 'arraybuffer',
        maxRedirects: 0,
        timeout: 20000,
        maxContentLength: 8 * 1024 * 1024,
        maxBodyLength: 8 * 1024 * 1024,
        headers: { 'User-Agent': 'Sale-IA-RB-Factory/1.0' }
      });
      const contentType = String(response.headers['content-type'] || '').split(';')[0].toLowerCase();
      if (!contentType.startsWith('image/')) continue;
      let ext = path.extname(new URL(sourceUrl).pathname).toLowerCase();
      if (!/^\.(jpe?g|png|webp|gif|svg)$/.test(ext)) {
        ext = contentType === 'image/png' ? '.png'
          : contentType === 'image/webp' ? '.webp'
          : contentType === 'image/gif' ? '.gif'
          : contentType === 'image/svg+xml' ? '.svg' : '.jpg';
      }
      const fileName = 'assets/image-' + String(files.length + 1) + ext;
      const buffer = Buffer.from(response.data);
      files.push({ name: fileName, content: buffer });
      localizedHtml = localizedHtml.split(sourceUrl).join(fileName);
    } catch {
      // Mantém a URL remota quando o provedor não permite download.
    }
  }

  return { html: localizedHtml, files };
}

function buildStaticZip(html: string, companyName: string, projectId: string, assetFiles: Array<{ name: string; content: Buffer }> = []): Buffer {
  const { buildZip } = require('../../utils/zipUtils') as typeof import('../../utils/zipUtils');
  const safeName = String(companyName || 'site').replace(/[\\/:*?"<>|]+/g, '-');
  const metadata = {
    projectId,
    companyName,
    generatedAt: new Date().toISOString(),
    hosting: 'NETLIFY',
    note: 'Generated by Sale-IA RB Factory. No API keys or secrets are included.'
  };
  return buildZip([
    { name: 'index.html', content: html },
    { name: 'metadata/site.json', content: JSON.stringify(metadata, null, 2) },
    { name: 'README.txt', content: 'RB Factory — site publicado via Netlify\nEmpresa: ' + safeName + '\n' },
    ...assetFiles
  ]);
}
