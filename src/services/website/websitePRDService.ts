// src/services/website/websitePRDService.ts
import { PRD, ResearchResult } from '../../types/websiteV2';
import { websiteAIEnhancerService } from './websiteAIEnhancerService';

export class WebsitePRDService {
  async generate(briefing: any, research: ResearchResult, prospect: any): Promise<PRD> {
    console.log(`[PRD] Gerando PRD para ${briefing.businessName || prospect.companyName}`);
    if (websiteAIEnhancerService.isAvailable) {
      try {
        const prompt = this.buildPrompt(briefing, research, prospect);
        const data = await websiteAIEnhancerService.generateJSON(prompt, 'prd');
        if (data) return this.normalize(data, briefing, research, prospect);
      } catch (e: any) {
        console.error('[PRD] IA falhou:', e?.message);
      }
    }
    return this.fallback(briefing, research, prospect);
  }

  private buildPrompt(briefing: any, research: ResearchResult, prospect: any): string {
    return `Voce e Product Manager especializado em websites comerciais.

NEGOCIO: ${briefing.businessName || prospect.companyName} | ${briefing.category || prospect.segment} | ${briefing.city || prospect.city}
SERVICOS: ${Array.isArray(briefing.services) ? briefing.services.join(', ') : ''}
DIFERENCIAIS: ${Array.isArray(briefing.differentials) ? briefing.differentials.join(', ') : ''}
PUBLICO: ${briefing.targetAudience || ''}
PESQUISA: estrutura=${research.recommendedStructure.join(',')} | visual=${research.recommendedVisualDirection}

Gere PRD em JSON:
{
  "business":{"businessName":"...","category":"...","city":"...","positioning":"...","valueProposition":"...","targetAudience":"...","objective":"..."},
  "strategy":{"primaryGoal":"...","secondaryGoals":["..."],"primaryCTA":"...","conversionStrategy":"..."},
  "ux":{"informationArchitecture":[{"title":"...","description":"..."}],"navigation":["..."],"userJourney":["..."],"sectionOrder":["..."]},
  "content":{"heroHeadline":"...","heroSubheadline":"...","primaryCTA":"...","services":[{"title":"...","description":"..."}],"benefits":[{"title":"...","description":"..."}],"faq":[{"question":"...","answer":"..."}],"contactContent":"..."},
  "design":{"visualDirection":"...","mood":"...","colorStrategy":"...","typographyStrategy":"...","spacingStrategy":"...","componentStrategy":"...","imageStrategy":"..."},
  "responsive":{"desktop":"...","tablet":"...","mobile":"..."},
  "seo":{"title":"...","metaDescription":"...","keywords":["..."],"headingStrategy":"..."}
}

Regras CRITICAS:
1. NUNCA use frases genéricas como "Oferecemos qualidade e excelência", "Somos referência no mercado" ou "Conte conosco".
2. Use os DIFERENCIAIS reais do briefing para criar a proposta de valor.
3. O texto deve mencionar a CIDADE e o SEGMENTO de forma natural.
4. CTAs devem ser específicos (ex: "Agende sua consulta em [Cidade]", "Peça seu [Serviço] agora").
5. Se o briefing não tiver depoimentos ou números, NÃO invente. Use a seção "Por que escolher a [Empresa]" com os diferenciais.
6. Max 800 palavras, seja direto e persuasivo.`;
  }

  private normalize(data: any, briefing: any, research: ResearchResult, prospect: any): PRD {
    const bn = briefing.businessName || prospect.companyName || 'Empresa';
    const cat = briefing.category || prospect.segment || 'negócio';
    const city = briefing.city || prospect.city || 'cidade';
    return {
      business: {
        businessName: data.business?.businessName || bn,
        category: data.business?.category || cat,
        city: data.business?.city || city,
        positioning: data.business?.positioning || `Referência em ${cat} em ${city}`,
        valueProposition: data.business?.valueProposition || `Excelência em ${cat}`,
        targetAudience: data.business?.targetAudience || briefing.targetAudience || 'Público local',
        objective: data.business?.objective || (Array.isArray(briefing.objectives) ? briefing.objectives[0] : briefing.objectives || 'Presença digital')
      },
      strategy: {
        primaryGoal: data.strategy?.primaryGoal || 'Gerar leads',
        secondaryGoals: data.strategy?.secondaryGoals || ['Fortalecer marca'],
        primaryCTA: data.strategy?.primaryCTA || briefing.ctaText || 'Entre em contato',
        conversionStrategy: data.strategy?.conversionStrategy || 'CTAs estratégicos'
      },
      ux: {
        informationArchitecture: data.ux?.informationArchitecture || research.recommendedStructure.map((s: string) => ({ title: s, description: `Seção ${s}` })),
        navigation: data.ux?.navigation || research.recommendedStructure.slice(0, 5),
        userJourney: data.ux?.userJourney || ['Chegada', 'Exploração', 'Conversão'],
        sectionOrder: data.ux?.sectionOrder || research.recommendedStructure
      },
      content: {
        heroHeadline: data.content?.heroHeadline || briefing.headline || `Excelência em ${cat}`,
        heroSubheadline: data.content?.heroSubheadline || `${bn} - Referência em ${city}`,
        primaryCTA: data.content?.primaryCTA || briefing.ctaText || 'Entre em contato',
        services: data.content?.services || (Array.isArray(briefing.services) ? briefing.services.map((s: string) => ({ title: s, description: `Serviço de ${s.toLowerCase()}` })) : []),
        benefits: data.content?.benefits || (Array.isArray(briefing.differentials) ? briefing.differentials.map((d: string) => ({ title: d, description: d })) : []),
        faq: data.content?.faq || [{ question: 'Como entrar em contato?', answer: 'Via WhatsApp ou formulário.' }],
        contactContent: data.content?.contactContent || 'Entre em contato'
      },
      design: {
        visualDirection: data.design?.visualDirection || research.recommendedVisualDirection,
        mood: data.design?.mood || 'Profissional e moderno',
        colorStrategy: data.design?.colorStrategy || 'Cores de confiança',
        typographyStrategy: data.design?.typographyStrategy || 'Tipografia clara',
        spacingStrategy: data.design?.spacingStrategy || 'Espaçamento generoso',
        componentStrategy: data.design?.componentStrategy || 'Componentes limpos',
        imageStrategy: data.design?.imageStrategy || 'Imagens de qualidade'
      },
      responsive: {
        desktop: data.responsive?.desktop || 'Layout completo',
        tablet: data.responsive?.tablet || 'Layout adaptado',
        mobile: data.responsive?.mobile || 'Layout mobile-first'
      },
      seo: {
        title: data.seo?.title || `${bn} - ${cat} em ${city}`,
        metaDescription: data.seo?.metaDescription || `${bn} - ${cat} em ${city}`,
        keywords: data.seo?.keywords || [cat, city, bn].filter(Boolean),
        headingStrategy: data.seo?.headingStrategy || 'H1/H2/H3 hierárquicos'
      }
    };
  }

  private fallback(briefing: any, research: ResearchResult, prospect: any): PRD {
    const bn = briefing.businessName || prospect.companyName || 'Empresa';
    const cat = briefing.category || prospect.segment || 'negócio';
    const city = briefing.city || prospect.city || 'cidade';
    return {
      business: { businessName: bn, category: cat, city, positioning: `Referência em ${cat}`, valueProposition: `Excelência em ${cat}`, targetAudience: briefing.targetAudience || 'Público local', objective: 'Presença digital profissional' },
      strategy: { primaryGoal: 'Gerar leads', secondaryGoals: ['Fortalecer marca'], primaryCTA: briefing.ctaText || 'Entre em contato', conversionStrategy: 'CTAs estratégicos' },
      ux: { informationArchitecture: research.recommendedStructure.map(s => ({ title: s, description: `Seção ${s}` })), navigation: research.recommendedStructure.slice(0, 5), userJourney: ['Chegada', 'Exploração', 'Conversão'], sectionOrder: research.recommendedStructure },
      content: {
        heroHeadline: briefing.headline || `Excelência em ${cat}`,
        heroSubheadline: `${bn} em ${city}`,
        primaryCTA: briefing.ctaText || 'Entre em contato',
        services: Array.isArray(briefing.services) ? briefing.services.map((s: string) => ({ title: s, description: `Serviço de ${s}` })) : [],
        benefits: Array.isArray(briefing.differentials) ? briefing.differentials.map((d: string) => ({ title: d, description: d })) : [],
        faq: [{ question: 'Como entrar em contato?', answer: 'Via WhatsApp.' }],
        contactContent: 'Entre em contato'
      },
      design: { visualDirection: research.recommendedVisualDirection, mood: 'Profissional', colorStrategy: 'Cores de confiança', typographyStrategy: 'Tipografia clara', spacingStrategy: 'Espaçamento generoso', componentStrategy: 'Componentes limpos', imageStrategy: 'Imagens de qualidade' },
      responsive: { desktop: 'Completo', tablet: 'Adaptado', mobile: 'Mobile-first' },
      seo: { title: `${bn} - ${cat} em ${city}`, metaDescription: `${bn} em ${city}`, keywords: [cat, city], headingStrategy: 'Hierárquico' }
    };
  }
}

export const websitePRDService = new WebsitePRDService();

