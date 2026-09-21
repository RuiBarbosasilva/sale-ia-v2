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
    {"name":"Tecnico","score":9,"feedback":"..."},
    {"name":"Premium / Direção de Arte","score":8,"feedback":"..."},
    {"name":"WhatsApp / Contato","score":8,"feedback":"..."},
    {"name":"Performance","score":8,"feedback":"..."}
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
- "Premium / Direção de Arte" avalia hierarquia visual, composição, tipografia, espaçamento, consistência e aparência de agência profissional.
- "WhatsApp / Contato" deve validar caminho de contato/WhatsApp claro quando houver telefone no briefing.
- "Performance" deve considerar imagens, fontes externas, CSS/JS e estabilidade visual; evite peso e dependências desnecessárias.
- NÃO aprove um site apenas porque o HTML funciona: a experiência visual e comercial precisa parecer deliberada, original e adequada ao negócio.
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
      if (assets.qualityIssues?.length) {
        issues.push(...assets.qualityIssues.slice(0, 5));
        imgCrit.score = Math.min(imgCrit.score, 4);
        imgCrit.feedback = 'Uma ou mais imagens do demo nao passaram na validacao';
      }
      if (assets.placeholderCount > 0) {
        imgCrit.score = Math.min(imgCrit.score, 5);
        issues.push('Existem imagens placeholder no demo');
      }
      if (issues.length > 0) r.criticalIssues = [...(r.criticalIssues || []), ...issues];
    }
    // Gates estruturais para o padrão premium da Factory.
    const hasViewport = /<meta[^>]+name=["\x27]viewport["\x27][^>]*>/i.test(html);
    const hasSemanticMain = /<main\b/i.test(html);
    const hasHeading = /<h1\b/i.test(html);
    const hasPrimaryCta = /class=["\x27][^"\x27]*(?:btn-primary|cta)[^"\x27]*["\x27]/i.test(html);
    const hasWhatsAppLink = /https?:\/\/(?:wa\.me|api\.whatsapp\.com)\/[^"\x27\s<]+/i.test(html);
    const hasExternalFont = /fonts\.(?:googleapis|gstatic)\.com/i.test(html);
    const hasLazyImages = /loading=["\x27]lazy["\x27]/i.test(html);
    const hasAltOnImages = !/<img\b/i.test(html) || /<img[^>]+alt=["\x27][^"\x27]*["\x27]/i.test(html);

    const premiumCrit = r.criteria.find(c => c.name === "Premium / Direção de Arte");
    if (premiumCrit) {
      if (!hasHeading || !hasPrimaryCta) premiumCrit.score = Math.min(premiumCrit.score, 6);
      if (!hasViewport) premiumCrit.score = Math.min(premiumCrit.score, 5);
    }
    const uxCrit = r.criteria.find(c => c.name === "UX");
    if (uxCrit && (!hasHeading || !hasPrimaryCta)) uxCrit.score = Math.min(uxCrit.score, 6);
    const mobileCrit = r.criteria.find(c => c.name === "Mobile");
    if (mobileCrit && !hasViewport) mobileCrit.score = Math.min(mobileCrit.score, 4);
    const responsiveCrit = r.criteria.find(c => c.name === "Responsividade");
    if (responsiveCrit && !hasViewport) responsiveCrit.score = Math.min(responsiveCrit.score, 4);

    const whatsappCrit = r.criteria.find(c => c.name === "WhatsApp / Contato");
    const phoneAvailable = Boolean((prd as any)?.business?.phone || (prd as any)?.contact?.phone);
    if (whatsappCrit) {
      if (phoneAvailable && !hasWhatsAppLink) {
        whatsappCrit.score = Math.min(whatsappCrit.score, 4);
        r.criticalIssues = [...(r.criticalIssues || []), "WhatsApp/contato não encontrado no HTML"];
      } else if (hasWhatsAppLink) whatsappCrit.score = Math.max(whatsappCrit.score, 8);
    }

    const perfCrit = r.criteria.find(c => c.name === "Performance");
    if (perfCrit) {
      if (hasExternalFont) perfCrit.score = Math.min(perfCrit.score, 8);
      if (/<script\b/i.test(html) && !/\bdefer(?:=["\x27][^"\x27]*["\x27])?/i.test(html)) perfCrit.score = Math.min(perfCrit.score, 7);
      if (/<img\b/i.test(html) && !hasLazyImages) perfCrit.score = Math.min(perfCrit.score, 8);
    }
    if (!hasSemanticMain) r.criticalIssues = [...(r.criticalIssues || []), "Estrutura semântica: <main> ausente"];
    if (!hasAltOnImages) r.criticalIssues = [...(r.criticalIssues || []), "Imagens sem cobertura adequada de alt"];

    // SEO: meta tags obrigatorias
    const seoCrit = r.criteria.find(c => c.name === 'SEO');
    if (seoCrit) {
      if (!html.includes('<title>')) seoCrit.score = Math.min(seoCrit.score, 3);
      if (!html.includes('meta name="description"')) seoCrit.score = Math.min(seoCrit.score, 4);
    }
    // Recalcular a nota depois das regras locais: a IA nao pode manter uma
    // media artificialmente alta apos uma regra estrutural reduzir criterios.
    r.overallScore = Math.round(
      (r.criteria.length ? r.criteria.reduce((sum, criterion) => sum + criterion.score, 0) / r.criteria.length : 0) * 10
    ) / 10;
    if ((r.criticalIssues || []).length > 0) {
      r.recommendation = 'improve';
    } else if (r.overallScore >= this.MIN_SCORE) {
      r.recommendation = 'approve';
    } else if (r.overallScore >= this.CRITICAL_THRESHOLD) {
      r.recommendation = 'improve';
    } else {
      r.recommendation = 'regenerate';
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
    const criticalIssues: string[] = [];

    if (assets) {
      const imgCrit = criteria.find(c => c.name === 'Imagens');
      if (imgCrit) {
        if (!assets.hasHero) {
          imgCrit.score = 4;
          imgCrit.feedback = 'Sem hero';
          criticalIssues.push('Falta hero image real');
        } else if (assets.heroProvider === 'local-placeholder') {
          imgCrit.score = 5;
          imgCrit.feedback = 'Hero placeholder';
          criticalIssues.push('Hero é placeholder');
        } else if (assets.realImageCount >= 6) {
          imgCrit.score = 9;
          imgCrit.feedback = `${assets.realImageCount} imagens reais`;
        }

        if (assets.placeholderCount > 0) {
          imgCrit.score = Math.min(imgCrit.score, 5);
          criticalIssues.push('Existem imagens placeholder no demo');
        }

        if (assets.qualityIssues?.length) {
          imgCrit.score = Math.min(imgCrit.score, 4);
          criticalIssues.push(...assets.qualityIssues.slice(0, 5));
        }

        if (assets.altCoverage < 0.8 && assets.imageCount > 0) {
          const accCrit = criteria.find(c => c.name === 'Acessibilidade');
          if (accCrit) accCrit.score = Math.min(accCrit.score, 6);
          criticalIssues.push('Cobertura alt abaixo de 80%');
        }
      }
    }

    const overall = criteria.reduce((s, c) => s + c.score, 0) / criteria.length;
    const overallScore = Math.round(overall * 10) / 10;
    const recommendation =
      criticalIssues.length > 0 ? 'improve' :
      overallScore >= this.MIN_SCORE ? 'approve' :
      overallScore >= this.CRITICAL_THRESHOLD ? 'improve' : 'regenerate';

    return {
      overallScore,
      criteria,
      strengths: ['Estrutura HTML5 válida', 'Design system aplicado'],
      weaknesses: [
        !hasResponsive ? 'Responsividade' : null,
        !hasMeta ? 'Meta SEO' : null,
        ...criticalIssues.slice(0, 3)
      ].filter(Boolean) as string[],
      improvements: ['Micro-interações', 'Core Web Vitals', 'Prova social'],
      criticalIssues,
      recommendation,
      assetsSummary: assets
    };
  }

  getMinScore(): number { return this.MIN_SCORE; }
  getCriticalThreshold(): number { return this.CRITICAL_THRESHOLD; }
}

export const websiteQualityService = new WebsiteQualityService();
