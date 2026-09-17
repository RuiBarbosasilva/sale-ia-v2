// src/services/website/websiteQualityService.ts
import { QualityReview, QualityCriterion, PRD, DesignSystem } from '../../types/websiteV2';
import { websiteAIEnhancerService } from './websiteAIEnhancerService';

export interface AssetsSummary {
  imageCount: number;
  realImageCount: number;
  placeholderCount: number;
  clientProvidedCount: number;
  altCoverage: number;
  lazyLoading: boolean;
  externalUrls: string[];
  byUsage: Record<string, number>;
  byProvider: Record<string, number>;
  hasHero: boolean;
  heroProvider: string | null;
  heroDimensions: string | null;
  qualityIssues: string[];
}

export interface QualityReport {
  overallScore: number;
  criteria: QualityCriterion[];
  strengths: string[];
  weaknesses: string[];
  improvements: string[];
  criticalIssues: string[];
  recommendation: 'approve' | 'improve' | 'regenerate';
  assetsSummary?: AssetsSummary;
}

export class WebsiteQualityService {
  private readonly MIN_SCORE = 7.5;
  private readonly CRITICAL_THRESHOLD = 5.0;

  async review(html: string, prd: PRD, designSystem: DesignSystem, assetsSummary?: AssetsSummary): Promise<QualityReport> {
    console.log('[Quality Review] Avaliando site' + (assetsSummary ? ' (com assets)' : ''));
    if (websiteAIEnhancerService.isAvailable) {
      try {
        const prompt = this.buildPrompt(html, prd, designSystem, assetsSummary);
        const data = await websiteAIEnhancerService.generateJSON(prompt, 'quality');
        if (data) {
          const r = this.normalize(data, assetsSummary);
          // Validar com regras locais (a IA pode inventar scores)
          const localValidated = this.applyLocalRules(r, html, prd, designSystem, assetsSummary);
          return localValidated;
        }
      } catch (e: any) {
        console.error('[Quality] IA falhou:', e?.message);
      }
    }
    return this.fallback(html, prd, designSystem, assetsSummary);
  }

  private buildPrompt(html: string, prd: PRD, ds: DesignSystem, assets?: AssetsSummary): string {
    const preview = html.substring(0, 2500);
    const assetsBlock = assets ? `\nASSETS DE IMAGEM:\n- Total: ${assets.imageCount}\n- Reais (fotografias): ${assets.realImageCount}\n- Placeholders: ${assets.placeholderCount}\n- Hero: ${assets.hasHero ? 'SIM (provider=' + assets.heroProvider + ', ' + assets.heroDimensions + ')' : 'NAO'}\n- Cobertura alt: ${Math.round(assets.altCoverage * 100)}%\n- Por uso: ${JSON.stringify(assets.byUsage)}\n- Por provider: ${JSON.stringify(assets.byProvider)}` : '';

    return `Voce e especialista em avaliacao de qualidade de websites comerciais brasileiros.

SEGMENTO: ${prd.business.category}
ESTILO: ${ds.visualStyle}
OBJETIVO: ${prd.business.objective}
${assetsBlock}

HTML (primeiros 2500 chars):
${preview}

Avalie cada criterio 0-10 e retorne JSON:
{
  "criteria": [
    {"name":"Qualidade Visual","score":8,"feedback":"..."},
    {"name":"Modernidade","score":7,"feedback":"..."},
    {"name":"Profissionalismo","score":9,"feedback":"..."},
    {"name":"UX","score":8,"feedback":"..."},
    {"name":"Mobile","score":7,"feedback":"..."},
    {"name":"Responsividade","score":8,"feedback":"..."},
    {"name":"Acessibilidade","score":6,"feedback":"..."},
    {"name":"Conversao","score":8,"feedback":"..."},
    {"name":"Conteudo","score":7,"feedback":"..."},
    {"name":"Imagens","score":8,"feedback":"..."},
    {"name":"Consistencia","score":8,"feedback":"..."},
    {"name":"SEO","score":7,"feedback":"..."},
    {"name":"Tecnico","score":9,"feedback":"..."}
  ],
  "strengths":["..."],
  "weaknesses":["..."],
  "improvements":["..."],
  "criticalIssues":["..."]
}

Regras criticas:
- NUNCA diga que uma imagem placeholder e "fotografia real"
- Se placeholderCount > 0, registre isso como weakness
- Se nao ha hero real, registre como weakness
- Se alt coverage < 80%, critique acessibilidade
- Seja especifico ao segmento (ex: hamburgueria precisa de fotos de produto)
- Max 3 strengths, 3 weaknesses, 3 improvements, 3 critical issues`;
  }

  private applyLocalRules(r: QualityReport, html: string, prd: PRD, ds: DesignSystem, assets?: AssetsSummary): QualityReport {
    // Regras locais que SEMPRE se aplicam (a IA nao pode contradizer fatos estruturais)
    const imgCrit = r.criteria.find(c => c.name === 'Imagens');
    if (imgCrit && assets) {
      const issues: string[] = [];
      // Hero real e OBRIGATORIO para score alto
      if (!assets.hasHero) {
        imgCrit.score = Math.min(imgCrit.score, 4);
        imgCrit.feedback = 'Sem hero image';
        issues.push('Falta hero image real');
      } else if (assets.heroProvider === 'local-placeholder') {
        imgCrit.score = Math.min(imgCrit.score, 5);
        imgCrit.feedback = 'Hero e placeholder, nao fotografia real';
        issues.push('Hero e placeholder SVG');
      }
      // Placeholders excessivos reduzem score
      if (assets.placeholderCount > assets.imageCount / 2 && assets.imageCount > 0) {
        imgCrit.score = Math.min(imgCrit.score, 5);
        issues.push('Mais de 50% das imagens sao placeholders');
      }
      // Alt coverage
      if (assets.altCoverage < 0.8 && assets.imageCount > 0) {
        const accCrit = r.criteria.find(c => c.name === 'Acessibilidade');
        if (accCrit) accCrit.score = Math.min(accCrit.score, 6);
        issues.push('Cobertura alt abaixo de 80%');
      }
      if (issues.length > 0) r.criticalIssues = [...(r.criticalIssues || []), ...issues];
    }
    // SEO: meta tags obrigatorias
    const seoCrit = r.criteria.find(c => c.name === 'SEO');
    if (seoCrit) {
      if (!html.includes('<title>')) seoCrit.score = Math.min(seoCrit.score, 3);
      if (!html.includes('meta name="description"')) seoCrit.score = Math.min(seoCrit.score, 4);
    }
    if ((r.criticalIssues || []).length > 0) {
      r.recommendation = 'improve';
    }
    return r;
  }

  private normalize(data: any, assets?: AssetsSummary): QualityReport {
    const criteria: QualityCriterion[] = Array.isArray(data.criteria)
      ? data.criteria.map((c: any) => ({ name: c.name || 'Critério', score: Math.max(0, Math.min(10, Number(c.score) || 5)), feedback: c.feedback || '' }))
      : [];
    const overall = criteria.length > 0 ? criteria.reduce((s, c) => s + c.score, 0) / criteria.length : 5;
    const rec: 'approve' | 'improve' | 'regenerate' = overall >= this.MIN_SCORE ? 'approve' : overall >= this.CRITICAL_THRESHOLD ? 'improve' : 'regenerate';
    return {
      overallScore: Math.round(overall * 10) / 10,
      criteria,
      strengths: Array.isArray(data.strengths) ? data.strengths.slice(0, 5) : [],
      weaknesses: Array.isArray(data.weaknesses) ? data.weaknesses.slice(0, 5) : [],
      improvements: Array.isArray(data.improvements) ? data.improvements.slice(0, 5) : [],
      criticalIssues: Array.isArray(data.criticalIssues) ? data.criticalIssues.slice(0, 5) : [],
      recommendation: rec,
      assetsSummary: assets
    };
  }

  private fallback(html: string, prd: PRD, ds: DesignSystem, assets?: AssetsSummary): QualityReport {
    const hasCTA = html.includes('btn-primary') || html.includes('cta');
    const hasMeta = html.includes('meta name="description"');
    const hasResponsive = html.includes('@media') || html.includes('viewport');
    const hasHeroImg = html.includes('class="hero-bg"') || html.includes('hero-image');
    const hasGallery = html.includes('gallery-item');
    const criteria: QualityCriterion[] = [
      { name: 'Qualidade Visual', score: 7, feedback: 'Design system aplicado' },
      { name: 'Modernidade', score: 7, feedback: 'HTML5 moderno' },
      { name: 'Profissionalismo', score: 8, feedback: 'Código estruturado' },
      { name: 'UX', score: 7, feedback: 'Estrutura de seções' },
      { name: 'Mobile', score: 7, feedback: 'Viewport configurado' },
      { name: 'Responsividade', score: hasResponsive ? 8 : 5, feedback: hasResponsive ? 'Media queries presentes' : 'Adicionar media queries' },
      { name: 'Acessibilidade', score: 6, feedback: 'Semântica básica' },
      { name: 'Conversão', score: hasCTA ? 8 : 5, feedback: hasCTA ? 'CTAs presentes' : 'Adicionar CTAs' },
      { name: 'Conteúdo', score: 7, feedback: 'Baseado no briefing' },
      { name: 'Imagens', score: (hasHeroImg && hasGallery) ? 8 : (hasHeroImg ? 6 : 4), feedback: (hasHeroImg && hasGallery) ? 'Hero + galeria' : hasHeroImg ? 'Apenas hero' : 'Sem imagens' },
      { name: 'Consistência', score: 8, feedback: 'Design system aplicado' },
      { name: 'SEO', score: hasMeta ? 7 : 4, feedback: hasMeta ? 'Meta tags OK' : 'Adicionar meta' },
      { name: 'Técnico', score: 9, feedback: `${html.length} bytes válidos` }
    ];
    if (assets) {
      const imgCrit = criteria.find(c => c.name === 'Imagens');
      if (imgCrit) {
        if (!assets.hasHero) { imgCrit.score = 4; imgCrit.feedback = 'Sem hero'; }
        else if (assets.heroProvider === 'local-placeholder') { imgCrit.score = 5; imgCrit.feedback = 'Hero placeholder'; }
        else if (assets.realImageCount >= 6) { imgCrit.score = 9; imgCrit.feedback = `${assets.realImageCount} imagens reais`; }
      }
    }
    const overall = criteria.reduce((s, c) => s + c.score, 0) / criteria.length;
    return {
      overallScore: Math.round(overall * 10) / 10,
      criteria,
      strengths: ['Estrutura HTML5 válida', 'Design system aplicado'],
      weaknesses: [!hasResponsive ? 'Responsividade' : null, !hasMeta ? 'Meta SEO' : null].filter(Boolean) as string[],
      improvements: ['Micro-interações', 'Core Web Vitals', 'Prova social'],
      criticalIssues: [],
      recommendation: overall >= this.MIN_SCORE ? 'approve' : overall >= this.CRITICAL_THRESHOLD ? 'improve' : 'regenerate',
      assetsSummary: assets
    };
  }

  getMinScore(): number { return this.MIN_SCORE; }
  getCriticalThreshold(): number { return this.CRITICAL_THRESHOLD; }
}

export const websiteQualityService = new WebsiteQualityService();
