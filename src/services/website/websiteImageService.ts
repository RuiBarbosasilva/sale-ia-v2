// src/services/website/websiteImageService.ts
import axios from 'axios';
import { DesignSystem, PRD } from '../../types/websiteV2';

export interface ImageAsset {
  url: string;
  width: number;
  height: number;
  alt: string;
}

export interface ImageMetadata {
  provider: string;
  sourceUrl: string;
  pageUrl?: string;
  author?: string;
  license?: string;
  downloadedAt: string;
  query: string;
  usage: string;
  width: number;
  height: number;
  alt: string;
  mime?: string;
}

interface Candidate {
  url: string; width: number; height: number;
  author?: string; license?: string; pageUrl?: string; alt?: string; mime?: string;
}

const UA = 'SaleIA-SiteFactory/3.0 (image-engine; contact: dev@sale-ia.local)';

const SEGMENTS: Record<string, any> = {
  hamburgueria: {
    hero: 'gourmet cheeseburger melted cheese dark background food photography',
    gallery: ['cheeseburger closeup sesame bun', 'crispy french fries burger meal', 'craft burger restaurant interior', 'beef patty grill flame smoke'],
    galleryTitle: 'Nossos Burgers', galleryLabel: 'galeria'
  },
  clinica: {
    hero: 'modern dental clinic interior bright clean',
    gallery: ['dental office reception modern', 'dentist chair equipment clean', 'dental team professionals', 'modern clinic corridor bright'],
    galleryTitle: 'Nossa Estrutura', galleryLabel: 'estrutura'
  },
  imobiliaria: {
    hero: 'modern house exterior architecture',
    gallery: ['modern apartment living room interior', 'house facade garden exterior', 'apartment building exterior modern', 'cozy bedroom interior design'],
    galleryTitle: 'Imoveis em Destaque', galleryLabel: 'imoveis'
  },
  restaurante: {
    hero: 'elegant restaurant interior table setting',
    gallery: ['gourmet dish plated fine dining', 'restaurant interior warm atmosphere', 'chef cooking kitchen flame', 'wine glasses table restaurant'],
    galleryTitle: 'Nossa Experiencia', galleryLabel: 'galeria'
  },
  advocacia: {
    hero: 'law office library books wooden desk',
    gallery: ['law office meeting room elegant', 'legal books shelf library', 'professional lawyer office desk', 'modern office building lobby'],
    galleryTitle: 'Nosso Escritorio', galleryLabel: 'estrutura'
  },
  b2b: {
    hero: 'modern office team meeting glass building',
    gallery: ['business team meeting office', 'modern office workspace computers', 'professional handshake business', 'corporate building exterior glass'],
    galleryTitle: 'Nossa Operacao', galleryLabel: 'estrutura'
  }
};

function detectSegment(category: string): string {
  const c = (category || '').toLowerCase();
  if (c.includes('burguer') || c.includes('hamburguer') || c.includes('burger')) return 'hamburgueria';
  if (c.includes('clinic') || c.includes('odonto') || c.includes('dent') || c.includes('medic') || c.includes('saude')) return 'clinica';
  if (c.includes('imob') || c.includes('corret') || c.includes('real estate') || c.includes('imovel')) return 'imobiliaria';
  if (c.includes('advoc') || c.includes('jurid') || c.includes('advog')) return 'advocacia';
  if (c.includes('restaur') || c.includes('pizzar') || c.includes('cafe') || c.includes('lanchon')) return 'restaurante';
  return 'b2b';
}

const stripHtml = (s: string) => (s || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

export class WebsiteImageService {
  // ---------- PROVIDERS ----------
  private async searchPexels(query: string): Promise<Candidate[]> {
    const key = process.env.PEXELS_API_KEY || '';
    if (!key) return [];
    try {
      const res = await axios.get('https://api.pexels.com/v1/search', {
        params: { query, per_page: 8, orientation: 'landscape' },
        headers: { Authorization: key, 'User-Agent': UA },
        timeout: 20000
      });
      return (res.data.photos || []).map((p: any) => ({
        url: p.src?.large2x || p.src?.large || '', width: p.width || 0, height: p.height || 0,
        author: p.photographer || '', license: 'Pexels License (uso comercial gratuito)',
        pageUrl: p.url || '', alt: p.alt || '', mime: 'image/jpeg'
      })).filter((c: Candidate) => c.url);
    } catch (e: any) { console.warn('[ImageEngine] Pexels falhou:', e?.response?.status || e?.message); return []; }
  }

  private async searchUnsplash(query: string): Promise<Candidate[]> {
    const key = process.env.UNSPLASH_ACCESS_KEY || '';
    if (!key) return [];
    try {
      const res = await axios.get('https://api.unsplash.com/search/photos', {
        params: { query, per_page: 8, orientation: 'landscape' },
        headers: { Authorization: 'Client-ID ' + key, 'User-Agent': UA },
        timeout: 20000
      });
      return (res.data.results || []).map((p: any) => ({
        url: p.urls?.regular || p.urls?.raw || '', width: p.width || 0, height: p.height || 0,
        author: p.user?.name || '', license: 'Unsplash License (uso comercial gratuito)',
        pageUrl: p.links?.html || '', alt: p.alt_description || '', mime: 'image/jpeg'
      })).filter((c: Candidate) => c.url);
    } catch (e: any) { console.warn('[ImageEngine] Unsplash falhou:', e?.response?.status || e?.message); return []; }
  }

  private async searchWikimedia(query: string): Promise<Candidate[]> {
    try {
      const res = await axios.get('https://commons.wikimedia.org/w/api.php', {
        params: {
          action: 'query', format: 'json', generator: 'search',
          gsrsearch: 'filetype:bitmap ' + query, gsrnamespace: 6, gsrlimit: 8,
          prop: 'imageinfo', iiprop: 'url|size|mime|extmetadata', iiurlwidth: 1600
        },
        headers: { 'User-Agent': UA, 'Api-User-Agent': UA },
        timeout: 20000
      });
      const pages = res.data?.query?.pages || {};
      const out: Candidate[] = [];
      for (const k of Object.keys(pages)) {
        const page = pages[k];
        const ii = page.imageinfo && page.imageinfo[0];
        if (!ii) continue;
        out.push({
          url: ii.thumburl || ii.url || '',
          width: ii.thumbwidth || ii.width || 0,
          height: ii.thumbheight || ii.height || 0,
          author: stripHtml(ii.extmetadata?.Artist?.value || ''),
          license: stripHtml(ii.extmetadata?.License?.value || 'CC (ver Commons)'),
          pageUrl: ii.descriptionurl || '',
          alt: stripHtml(ii.extmetadata?.ImageDescription?.value || '') || String(page.title || '').replace(/^File:/, '').replace(/\.[a-z]+$/i, '').replace(/[_-]+/g, ' '),
          mime: ii.mime || ''
        });
      }
      return out.filter(c => c.url);
    } catch (e: any) { console.warn('[ImageEngine] Wikimedia falhou:', e?.response?.status || e?.message); return []; }
  }

  // ---------- PLACEHOLDER LOCAL (fallback honesto, rotulado) ----------
  private placeholder(slot: string, usage: string, ds: any): { asset: ImageAsset; meta: ImageMetadata } {
    const c = ds?.colors || {};
    const primary = c.primary || '#2563eb';
    const secondary = c.secondary || '#1e40af';
    const accent = c.accent || '#10b981';
    const w = slot === 'hero' ? 1600 : 800;
    const h = slot === 'hero' ? 900 : 600;
    const svg = [
      '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '">',
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">',
      '<stop offset="0" stop-color="' + primary + '"/><stop offset="1" stop-color="' + secondary + '"/>',
      '</linearGradient></defs>',
      '<rect width="' + w + '" height="' + h + '" fill="url(#g)"/>',
      '<circle cx="' + (w * 0.82) + '" cy="' + (h * 0.25) + '" r="' + (h * 0.35) + '" fill="' + accent + '" opacity="0.25"/>',
      '<circle cx="' + (w * 0.15) + '" cy="' + (h * 0.85) + '" r="' + (h * 0.45) + '" fill="#ffffff" opacity="0.08"/>',
      '<text x="' + (w * 0.06) + '" y="' + (h * 0.68) + '" font-family="Arial, sans-serif" font-size="' + Math.round(h * 0.05) + '" fill="#ffffff" opacity="0.75">Imagem ilustrativa - ' + this.escXml(usage) + '</text>',
      '</svg>'
    ].join('');
    const url = 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
    const alt = 'Imagem ilustrativa de ' + usage + ' (placeholder grafico gerado localmente, nao e fotografia real)';
    return {
      asset: { url, width: w, height: h, alt },
      meta: {
        provider: 'local-placeholder', sourceUrl: '(data-uri embutido)', author: 'Sale-IA Site Factory (gerado)',
        license: 'generated-locally', downloadedAt: new Date().toISOString(),
        query: 'placeholder:' + usage, usage, width: w, height: h, alt, mime: 'image/svg+xml'
      }
    };
  }

  private escXml(s: string) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  // ---------- QUALITY CONTROL ----------
  private passesQC(c: Candidate, slot: string, usedUrls: Set<string>): boolean {
    if (!c.url || usedUrls.has(c.url)) return false;
    if (c.mime && !/image\/(jpeg|png|webp)/.test(c.mime)) return false;
    const ratio = c.width / Math.max(1, c.height);
    if (slot === 'hero') {
      if (c.width < 1000 || c.height < 500) return false;
      if (ratio < 1.2 || ratio > 3.2) return false;
    } else {
      if (c.width < 500 || c.height < 350) return false;
      if (ratio < 0.65 || ratio > 2.8) return false;
    }
    return true;
  }

  private async acquire(query: string, slot: string, usage: string, ds: any, usedUrls: Set<string>, index: number): Promise<{ asset: ImageAsset; meta: ImageMetadata }> {
    const providers: Array<[string, (q: string) => Promise<Candidate[]>]> = [
      ['pexels', (q) => this.searchPexels(q)],
      ['unsplash', (q) => this.searchUnsplash(q)],
      ['wikimedia-commons', (q) => this.searchWikimedia(q)]
    ];
    // Variantes de query: completa -> 3 palavras -> 2 palavras (melhora recall no Commons)
    const words = query.split(' ').filter(w => w.length > 0);
    const variants = [...new Set([query, words.slice(0, 3).join(' '), words.slice(0, 2).join(' ')])].filter(v => v.length > 0);
    for (const variant of variants) {
      for (const [name, fn] of providers) {
        try {
          const candidates = await fn(variant);
          for (const cand of candidates) {
            if (this.passesQC(cand, slot, usedUrls)) {
              usedUrls.add(cand.url);
              const alt = (cand.alt && cand.alt.length > 8) ? cand.alt.substring(0, 120) : (usage + ' - foto via ' + name);
              const meta: ImageMetadata = {
                provider: name, sourceUrl: cand.url, pageUrl: cand.pageUrl, author: cand.author,
                license: cand.license, downloadedAt: new Date().toISOString(), query: variant, usage,
                width: cand.width, height: cand.height, alt, mime: cand.mime
              };
              console.log('[ImageEngine] ' + slot + ' [' + usage + '] -> ' + name + ' (' + cand.width + 'x' + cand.height + ') query="' + variant + '"');
              return { asset: { url: cand.url, width: cand.width, height: cand.height, alt }, meta };
            }
          }
        } catch (e: any) { /* tenta proximo provider */ }
        await new Promise(r => setTimeout(r, 200));
      }
    }
    console.warn('[ImageEngine] ' + slot + ' [' + usage + ']: nenhum provider retornou imagem valida -> placeholder local rotulado');
    const ph = this.placeholder(slot, usage, ds);
    usedUrls.add(ph.asset.url);
    return ph;
  }

  // ---------- ESTRATEGIA + AQUISICAO ----------
  async acquireAssets(briefing: any, prd: PRD, ds: DesignSystem): Promise<{ assets: any; metadata: ImageMetadata[] }> {
    const segmentKey = detectSegment(prd?.business?.category || briefing?.category || '');
    const seg = SEGMENTS[segmentKey] || SEGMENTS.b2b;
    const businessName = prd?.business?.businessName || briefing?.businessName || 'Empresa';
    const usedUrls = new Set<string>();
    const metadata: ImageMetadata[] = [];

    console.log('[ImageEngine] Estrategia de imagens | segmento detectado: ' + segmentKey);

    // HERO (1 imagem, landscape, alta resolucao)
    const heroQuery = seg.hero;
    const hero = await this.acquire(heroQuery, 'hero', 'imagem principal (hero) - ' + segmentKey, ds, usedUrls, 0);
    metadata.push(hero.meta);

    // GALERIA (3-5 imagens adaptadas ao segmento)
    const galleryQueries = seg.gallery.slice(0, 4);
    const firstService = prd?.content?.services?.[0]?.title;
    if (firstService) galleryQueries[1] = (firstService + ' ' + segmentKey).toLowerCase();
    const gallery: ImageAsset[] = [];
    for (let i = 0; i < galleryQueries.length; i++) {
      const g = await this.acquire(galleryQueries[i], 'gallery', 'galeria: ' + galleryQueries[i], ds, usedUrls, i + 1);
      gallery.push(g.asset);
      metadata.push(g.meta);
    }

    // IMAGENS DE SERVICO (max 3, opcionais)
    const services: Record<string, ImageAsset> = {};
    const svcList = (prd?.content?.services || []).slice(0, 3);
    for (let i = 0; i < svcList.length; i++) {
      const s = svcList[i];
      const q = (s.title + ' ' + segmentKey).toLowerCase();
      const img = await this.acquire(q, 'service', 'servico: ' + s.title, ds, usedUrls, i + 5);
      services[s.title] = img.asset;
      metadata.push(img.meta);
    }

    // LOGO: somente se o cliente forneceu URL (nunca inventada)
    let logo: ImageAsset | null = null;
    if (briefing?.logoUrl && /^https?:\/\//.test(briefing.logoUrl)) {
      logo = { url: briefing.logoUrl, width: 0, height: 0, alt: 'Logotipo de ' + businessName };
      metadata.push({
        provider: 'client-provided', sourceUrl: briefing.logoUrl, author: businessName,
        license: 'fornecida pelo cliente', downloadedAt: new Date().toISOString(),
        query: 'logo do cliente', usage: 'logotipo', width: 0, height: 0, alt: logo.alt
      });
    }

    const assets = { hero: hero.asset, gallery, services, logo, galleryTitle: seg.galleryTitle, galleryLabel: seg.galleryLabel };
    return { assets, metadata };
  }

  // --- IMAGE QUALITY VALIDATION (P0.1) ---
  async validateImageAsset(asset: any): Promise<{ valid: boolean; issues: string[]; reason: string }> {
    const issues: string[] = [];
    if (!asset || !asset.url) return { valid: false, issues: ['missing url'], reason: 'asset vazio' };
    if (asset.url.startsWith('data:')) return { valid: true, issues: [], reason: 'placeholder local (valido)' };
    if (!/^https?:\/\//i.test(asset.url)) {
      issues.push('URL invalida (nao http)');
      return { valid: false, issues, reason: 'URL invalida' };
    }
    // Head request para validar sem baixar
    try {
      const res = await axios.head(asset.url, { timeout: 8000, headers: { 'User-Agent': UA }, maxRedirects: 3, validateStatus: (s: number) => s < 500 });
      if (res.status >= 400) { issues.push('HTTP ' + res.status); return { valid: false, issues, reason: 'HTTP ' + res.status }; }
      const ct = String(res.headers['content-type'] || '').toLowerCase();
      if (ct && !/image\/(jpeg|jpg|png|webp|gif|svg)/.test(ct)) {
        issues.push('MIME invalido: ' + ct);
        return { valid: false, issues, reason: 'MIME invalido' };
      }
      const cl = parseInt(String(res.headers['content-length'] || '0'), 10);
      if (cl > 0 && cl > 15 * 1024 * 1024) {
        issues.push('arquivo > 15MB');
        return { valid: false, issues, reason: 'arquivo muito grande' };
      }
      return { valid: true, issues: [], reason: 'OK' };
    } catch (e: any) {
      issues.push('erro rede: ' + (e?.message || '').substring(0, 80));
      return { valid: false, issues, reason: 'erro rede' };
    }
  }

  // --- ASSETS SUMMARY (para Quality Review) ---
  analyzeAssetsMetadata(metadata: any[]): any {
    if (!Array.isArray(metadata) || metadata.length === 0) {
      return { imageCount: 0, realImageCount: 0, placeholderCount: 0, altCoverage: 0, lazyLoading: true, externalUrls: [], byUsage: {}, byProvider: {}, hasHero: false, qualityIssues: [] };
    }
    const realCount = metadata.filter(m => m.provider !== 'local-placeholder' && m.provider !== 'client-provided').length;
    const placeholderCount = metadata.filter(m => m.provider === 'local-placeholder').length;
    const clientCount = metadata.filter(m => m.provider === 'client-provided').length;
    const altCoverage = metadata.length > 0 ? metadata.filter(m => m.alt && m.alt.length > 5).length / metadata.length : 0;
    const byUsage: any = {};
    const byProvider: any = {};
    const externalUrls: string[] = [];
    for (const m of metadata) {
      byUsage[m.usage] = (byUsage[m.usage] || 0) + 1;
      byProvider[m.provider] = (byProvider[m.provider] || 0) + 1;
      if (m.sourceUrl && !m.sourceUrl.startsWith('data:')) externalUrls.push(m.sourceUrl);
    }
    const heroMeta = metadata.find(m => m.usage && String(m.usage).toLowerCase().includes('hero'));
    return {
      imageCount: metadata.length,
      realImageCount: realCount,
      placeholderCount,
      clientProvidedCount: clientCount,
      altCoverage: Math.round(altCoverage * 100) / 100,
      lazyLoading: true,
      externalUrls,
      byUsage,
      byProvider,
      hasHero: !!heroMeta,
      heroProvider: heroMeta ? heroMeta.provider : null,
      heroDimensions: heroMeta ? (heroMeta.width + 'x' + heroMeta.height) : null,
      qualityIssues: []
    };
  }

  /**
   * Reconstrói o objeto assets (hero/gallery/services/logo) a partir do metadata salvo.
   * Usado pelo regenerateDemo para PRESERVAR imagens entre versões.
   */
  rebuildAssets(metadata: any[]): any {
    const assets: any = { hero: null, gallery: [], services: {}, logo: null, galleryTitle: 'Galeria', galleryLabel: 'galeria' };
    if (!Array.isArray(metadata)) return assets;
    for (const m of metadata) {
      const usage = String(m.usage || '').toLowerCase();
      const asset = { url: m.sourceUrl, width: m.width || 0, height: m.height || 0, alt: m.alt || '' };
      if (!asset.url) continue;
      if (usage.includes('hero')) assets.hero = asset;
      else if (usage.includes('galeria')) assets.gallery.push(asset);
      else if (usage.includes('servico')) {
        const title = m.usage.replace(/^servico:\s*/i, '');
        assets.services[title] = asset;
      }
      else if (usage.includes('logotipo')) assets.logo = asset;
    }
    return assets;
  }
}

export const websiteImageService = new WebsiteImageService();






