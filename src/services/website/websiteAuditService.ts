import axios from 'axios';

export type WebsiteAuditResult = {
  url: string;
  reachable: boolean;
  statusCode: number | null;
  auditScore: number;
  score: number;
  status: 'NO_WEBSITE' | 'WEBSITE_POOR' | 'HAS_WEBSITE';
  opportunityStatus: 'HIGH' | 'MEDIUM' | 'LOW';
  opportunityScore: number;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  https: boolean;
  responseMs: number | null;
  title: string | null;
  issues: string[];
  checkedAt: string;
};

function normalizeUrl(raw: string): string {
  const value = String(raw || '').trim();
  if (!value) throw new Error('URL_REQUIRED');
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  return withProtocol.replace(/\/+$/, '').toLowerCase();
}

type AuditCacheEntry = {
  value: WebsiteAuditResult;
  expiresAt: number;
};

const auditCache = new Map<string, AuditCacheEntry>();
const AUDIT_CACHE_TTL_MS = 30 * 60 * 1000;
const AUDIT_CACHE_MAX_ENTRIES = 1000;

function getCachedAudit(url: string): WebsiteAuditResult | null {
  const cached = auditCache.get(url);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    auditCache.delete(url);
    return null;
  }
  return cached.value;
}

function cacheAudit(url: string, value: WebsiteAuditResult): void {
  if (auditCache.size >= AUDIT_CACHE_MAX_ENTRIES) {
    const oldestKey = auditCache.keys().next().value;
    if (oldestKey) auditCache.delete(oldestKey);
  }
  auditCache.set(url, {
    value,
    expiresAt: Date.now() + AUDIT_CACHE_TTL_MS,
  });
}

export const websiteAuditService = {
  async audit(rawUrl: string): Promise<WebsiteAuditResult> {
    const url = normalizeUrl(rawUrl);
    const cached = getCachedAudit(url);
    if (cached) return cached;

    const started = Date.now();
    const issues: string[] = [];

    try {
      const response = await axios.get(url, {
        timeout: 10000,
        maxRedirects: 5,
        validateStatus: () => true,
        headers: { 'User-Agent': 'SALE-IA-V2-Website-Audit/1.0' }
      });

      const html = String(response.data || '');
      const responseMs = Date.now() - started;
      const https = /^https:/i.test(response.request?.res?.responseUrl || url);
      const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, ' ').trim() || null;
      const hasViewport = /name=["']viewport["']/i.test(html);
      const hasDescription = /name=["']description["']/i.test(html);
      const hasHttps = /^https:/i.test(url);

      if (response.status >= 400) issues.push(`HTTP_${response.status}`);
      if (!hasHttps) issues.push('NO_HTTPS');
      if (!hasViewport) issues.push('NO_MOBILE_VIEWPORT');
      if (!hasDescription) issues.push('NO_META_DESCRIPTION');
      if (!title) issues.push('NO_TITLE');
      if (responseMs > 3000) issues.push('SLOW_RESPONSE');

      let score = 100 - issues.length * 12;
      if (!hasViewport) score -= 8;
      if (!hasDescription) score -= 5;
      score = Math.max(0, Math.min(100, score));

      const poor = response.status >= 400 || score < 65;
      const opportunityScore = Math.max(0, 100 - score);

      const result: WebsiteAuditResult = {
        url,
        reachable: response.status < 400,
        statusCode: response.status,
        auditScore: score,
        score,
        status: poor ? 'WEBSITE_POOR' : 'HAS_WEBSITE',
        opportunityStatus: opportunityScore >= 50 ? 'HIGH' : opportunityScore >= 25 ? 'MEDIUM' : 'LOW',
        opportunityScore,
        priority: opportunityScore >= 50 ? 'HIGH' : opportunityScore >= 25 ? 'MEDIUM' : 'LOW',
        https,
        responseMs,
        title,
        issues,
        checkedAt: new Date().toISOString()
      };

      cacheAudit(url, result);
      return result;
    } catch (error: any) {
      const result: WebsiteAuditResult = {
        url,
        reachable: false,
        statusCode: null,
        auditScore: 0,
        score: 0,
        status: 'WEBSITE_POOR',
        opportunityStatus: 'HIGH',
        opportunityScore: 100,
        priority: 'HIGH',
        https: /^https:/i.test(url),
        responseMs: Date.now() - started,
        title: null,
        issues: [error?.code || error?.message || 'REQUEST_FAILED'],
        checkedAt: new Date().toISOString()
      };

      cacheAudit(url, result);
      return result;
    }
  }
};
