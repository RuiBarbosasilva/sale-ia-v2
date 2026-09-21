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

function cleanHtmlText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
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
      const finalUrl = response.request?.res?.responseUrl || url;
      const https = /^https:/i.test(finalUrl);
      const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, ' ').trim() || null;
      const hasViewport = /name=["']viewport["']/i.test(html);
      const hasDescription = /name=["']description["']/i.test(html);
      const hasCanonical = /<link[^>]+rel=["'][^"']*canonical[^"']*["']/i.test(html);
      const hasH1 = /<h1(?:\s[^>]*)?>[\s\S]*?<\/h1>/i.test(html);
      const hasNav = /<nav(?:\s[^>]*)?>[\s\S]*?<\/nav>/i.test(html);
      const hasContactLink = /(?:href|action)=["'][^"']*(?:contato|contact|whatsapp|tel:|mailto:)[^"']*["']/i.test(html);
      const hasPhone = /(?:\+?\d[\s().-]?){8,}/.test(cleanHtmlText(html));
      const hasSocialLink = /(?:instagram|facebook|linkedin|youtube|tiktok)\.com/i.test(html);
      const textLength = cleanHtmlText(html).length;
      const imageCount = (html.match(/<img\b/gi) || []).length;
      const hasModernMeta = /<meta[^>]+(?:name|property)=["'](?:og:|twitter:|theme-color)/i.test(html);

      if (response.status >= 400) issues.push(`HTTP_${response.status}`);
      if (!https) issues.push('NO_HTTPS');
      if (!hasViewport) issues.push('NO_MOBILE_VIEWPORT');
      if (!hasDescription) issues.push('NO_META_DESCRIPTION');
      if (!title) issues.push('NO_TITLE');
      if (!hasH1) issues.push('NO_H1');
      if (!hasNav) issues.push('NO_NAVIGATION');
      if (textLength < 300) issues.push('LOW_CONTENT');
      if (imageCount === 0) issues.push('NO_IMAGES');
      if (!hasContactLink && !hasPhone) issues.push('NO_CONTACT_SIGNAL');
      if (!hasCanonical) issues.push('NO_CANONICAL');
      if (!hasSocialLink) issues.push('NO_SOCIAL_LINK');
      if (!hasModernMeta) issues.push('NO_SOCIAL_META');
      if (responseMs > 3000) issues.push('SLOW_RESPONSE');

      // Sinais comerciais e técnicos têm pesos diferentes.
      // Ausência de SEO/social isoladamente não transforma um site em
      // oportunidade forte; problemas de acesso, mobile e contato pesam mais.
      let score = 100;
      const deductions: Record<string, number> = {
        HTTP: 45,
        NO_HTTPS: 12,
        NO_MOBILE_VIEWPORT: 22,
        NO_META_DESCRIPTION: 5,
        NO_TITLE: 8,
        NO_H1: 5,
        NO_NAVIGATION: 8,
        LOW_CONTENT: 12,
        NO_IMAGES: 6,
        NO_CONTACT_SIGNAL: 18,
        NO_CANONICAL: 3,
        NO_SOCIAL_LINK: 2,
        NO_SOCIAL_META: 2,
        SLOW_RESPONSE: 12,
      };

      for (const issue of issues) {
        const key = issue.startsWith('HTTP_') ? 'HTTP' : issue;
        score -= deductions[key] || 0;
      }

      score = Math.max(0, Math.min(100, score));

      const reachable = response.status >= 200 && response.status < 400;
      const criticalFailure =
        !reachable ||
        issues.includes('NO_MOBILE_VIEWPORT') ||
        issues.includes('NO_CONTACT_SIGNAL');

      const poor = !reachable || score < 55;
      const opportunityScore = Math.max(0, 100 - score);

      let opportunityStatus: 'HIGH' | 'MEDIUM' | 'LOW';
      if (!reachable || (criticalFailure && opportunityScore >= 35) || opportunityScore >= 65) {
        opportunityStatus = 'HIGH';
      } else if (opportunityScore >= 35) {
        opportunityStatus = 'MEDIUM';
      } else {
        opportunityStatus = 'LOW';
      }

      const result: WebsiteAuditResult = {
        url,
        reachable,
        statusCode: response.status,
        auditScore: score,
        score,
        status: poor ? 'WEBSITE_POOR' : 'HAS_WEBSITE',
        opportunityStatus,
        opportunityScore,
        priority: opportunityStatus,
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
