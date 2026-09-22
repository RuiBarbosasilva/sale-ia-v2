import axios from 'axios';

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

export const netlifyDeploymentService = {
  isConfigured(): boolean {
    return Boolean(token());
  },

  async deployStaticSite(input: {
    projectId: string;
    companyName: string;
    html: string;
    customDomain?: string;
    existingSiteId?: string | null;
  }) {
    if (!token()) throw new Error('NETLIFY_NOT_CONFIGURED');
    if (!input.projectId || !input.html) throw new Error('NETLIFY_INVALID_DEPLOYMENT');

    let site: NetlifySite;
    if (input.existingSiteId) {
      site = await getSite(input.existingSiteId);
    } else {
      site = await createSite(siteSlug(input.companyName, input.projectId), normalizeUrl(input.customDomain) || undefined);
    }

    if (!site.id) throw new Error('NETLIFY_SITE_ID_MISSING');

    const zip = buildStaticZip(input.html, input.companyName, input.projectId);
    const deploy = await deployZip(site.id, zip);
    if (!deploy.id) throw new Error('NETLIFY_DEPLOY_ID_MISSING');

    const ready = await waitForReady(deploy.id);
    const publicUrl = normalizeUrl(
      site.custom_domain || ready.ssl_url || ready.deploy_url || site.ssl_url || site.url
    );
    if (!publicUrl) throw new Error('NETLIFY_PUBLIC_URL_MISSING');

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

function buildStaticZip(html: string, companyName: string, projectId: string): Buffer {
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
    { name: 'README.txt', content: 'RB Factory — site publicado via Netlify\\nEmpresa: ' + safeName + '\\n' }
  ]);
}
