// src/services/website/websiteCreativeDirectorService.ts
import { DesignSystem, PRD, ResearchResult } from '../../types/websiteV2';
import { websiteAIEnhancerService } from './websiteAIEnhancerService';

export class WebsiteCreativeDirectorService {
  async direct(prd: PRD, research: ResearchResult, briefing: any): Promise<DesignSystem> {
    const category = prd.business.category.toLowerCase();
    console.log(`[Creative Director] Criando direção visual para ${category}`);
    if (websiteAIEnhancerService.isAvailable) {
      try {
        const prompt = this.buildPrompt(prd, research);
        const data = await websiteAIEnhancerService.generateJSON(prompt, 'creative');
        if (data) return this.normalize(data, prd);
      } catch (e: any) {
        console.error('[Creative Director] IA falhou:', e?.message);
      }
    }
    return this.fallback(category);
  }

  private buildPrompt(prd: PRD, research: ResearchResult): string {
    return `
Voce e Diretor de Arte especializado em design de websites comerciais brasileiros.

NEGOCIO:
${prd.business.businessName}

SEGMENTO:
${prd.business.category}

CIDADE:
${prd.business.city}

POSICIONAMENTO:
${prd.business.positioning}

PROPOSTA DE VALOR:
${prd.business.valueProposition}

PUBLICO-ALVO:
${prd.business.targetAudience}

OBJETIVO:
${prd.business.objective}

DIRECAO VISUAL:
${prd.design.visualDirection}

MOOD:
${prd.design.mood}

PESQUISA:
${JSON.stringify(research.marketInsights)}

INSIGHTS DE CONVERSAO:
${JSON.stringify(research.conversionInsights)}

REFERENCIAS DE DESIGN:
${JSON.stringify(research.designReferences)}

Crie um Design System e uma arquitetura de pagina em JSON.

IMPORTANTE:
- NAO use templates prontos.
- NAO repita automaticamente estruturas de outros sites.
- Crie a arquitetura especificamente para este negocio.
- Considere segmento, publico, objetivo, posicionamento e pesquisa.
- Escolha somente secoes realmente relevantes.
- Varie estrutura e composicao entre negocios.
- Uma mesma categoria pode ter arquiteturas diferentes.
- Evite automaticamente a sequencia Hero -> Servicos -> Beneficios -> Galeria -> Sobre -> FAQ -> CTA.
- Use variantes diferentes quando fizer sentido.
- Entre 5 e 10 secoes principais.
- NAO invente informacoes especificas que nao estejam no briefing ou pesquisa.
- Priorize clareza, confianca, experiencia mobile e conversao.
- O resultado deve parecer criado especificamente para este negocio por uma agencia digital profissional.
- Use a pesquisa de design como repertorio de padrões: hierarquia, composição, navegação, uso de espaço, tipografia, contraste, fotografia, microinterações e CTA. NÃO copie identidade, textos, layout ou componentes proprietários de nenhum site de referência.
- Crie uma direção de arte premium com 1 ideia visual central, 1 hierarquia de CTA e 1 sistema de componentes coerente.
- O hero deve comunicar negócio + benefício + ação em poucos segundos.
- Planeje uma jornada clara: descoberta → confiança → valor → prova legítima → ação.
- Evite aparência de template: varie grid, ritmo vertical, proporção de mídia, alinhamentos e tratamento das seções conforme o segmento.
- Mobile-first: priorize leitura, toque, velocidade, imagens responsivas e CTA acessível.
- Performance: evite dependências e efeitos desnecessários; imagens e fontes devem ser usadas com parcimônia.
- Acessibilidade: contraste, foco, HTML semântico, alt text e navegação por teclado devem ser considerados desde o design.

FORMATO JSON:
{
  "visualStyle":"...",
  "layoutStyle":"...",
  "pageArchitecture":{
    "type":"conversion|institutional|catalog|portfolio|local-business|lead-generation|booking|other",
    "objective":"...",
    "sections":[
      {
        "type":"hero|services|products|features|benefits|about|team|process|gallery|portfolio|testimonials|social-proof|stats|faq|location|contact|booking|menu|pricing|cases|cta|other",
        "variant":"...",
        "title":"...",
        "priority":1,
        "enabled":true,
        "conversionRole":"attention|trust|education|proof|consideration|conversion|navigation"
      }
    ]
  },
  "colors":{
    "primary":"#hex",
    "secondary":"#hex",
    "accent":"#hex",
    "background":"#hex",
    "surface":"#hex",
    "text":"#hex",
    "textMuted":"#hex",
    "border":"#hex"
  },
  "typography":{
    "fontFamily":"...",
    "headingFont":"...",
    "baseSize":"16px",
    "headingSizes":{"h1":"...","h2":"...","h3":"...","h4":"..."},
    "lineHeight":"1.6",
    "letterSpacing":"normal"
  },
  "spacing":{"xs":"0.5rem","sm":"1rem","md":"1.5rem","lg":"2rem","xl":"3rem","xxl":"4rem"},
  "borderRadius":{"sm":"4px","md":"8px","lg":"12px","xl":"16px","full":"9999px"},
  "shadows":{"sm":"...","md":"...","lg":"...","xl":"..."}
}

Retorne SOMENTE JSON valido, sem markdown e sem explicacoes.
`;
  }  private normalize(data: any, prd: PRD): DesignSystem {
    const base = this.baseForCategory(prd.business.category.toLowerCase());
    return {
      visualStyle: data.visualStyle || base.visualStyle,
      layoutStyle: data.layoutStyle || base.layoutStyle,
      colors: {
        primary: data.colors?.primary || base.colors.primary,
        secondary: data.colors?.secondary || base.colors.secondary,
        accent: data.colors?.accent || base.colors.accent,
        background: data.colors?.background || base.colors.background,
        surface: data.colors?.surface || base.colors.surface,
        text: data.colors?.text || base.colors.text,
        textMuted: data.colors?.textMuted || base.colors.textMuted,
        border: data.colors?.border || base.colors.border
      },
      typography: {
        fontFamily: data.typography?.fontFamily || base.typography.fontFamily,
        headingFont: data.typography?.headingFont || base.typography.headingFont,
        baseSize: data.typography?.baseSize || '16px',
        headingSizes: data.typography?.headingSizes || base.typography.headingSizes,
        lineHeight: data.typography?.lineHeight || '1.6',
        letterSpacing: data.typography?.letterSpacing || 'normal'
      },
      spacing: data.spacing || base.spacing,
      borderRadius: data.borderRadius || base.borderRadius,
      shadows: data.shadows || base.shadows,
      buttons: base.buttons, cards: base.cards, hero: base.hero,
      sections: data.sections || base.sections, navigation: base.navigation, footer: base.footer,
      pageArchitecture: data.pageArchitecture || this.buildFallbackArchitecture(prd)
    };
  }
  private buildFallbackArchitecture(prd: PRD): any {
    const category = String(prd.business.category || "").toLowerCase();

    if (category.includes("hamburg") || category.includes("restaurante")) {
      return {
        type: "local-business",
        objective: "gerar pedidos e visitas",
        sections: [
          { type: "hero", variant: "conversion", priority: 1, enabled: true, conversionRole: "attention" },
          { type: "highlights", variant: "products", priority: 2, enabled: true, conversionRole: "value" },
          { type: "gallery", variant: "visual", priority: 3, enabled: true, conversionRole: "desire" },
          { type: "location", variant: "local", priority: 4, enabled: true, conversionRole: "visit" },
          { type: "cta", variant: "primary", priority: 5, enabled: true, conversionRole: "conversion" }
        ]
      };
    }

    if (category.includes("clinica") || category.includes("medic")) {
      return {
        type: "booking",
        objective: "gerar agendamentos com confiança",
        sections: [
          { type: "hero", variant: "trust", priority: 1, enabled: true, conversionRole: "attention" },
          { type: "benefits", variant: "trust", priority: 2, enabled: true, conversionRole: "trust" },
          { type: "services", variant: "clinical", priority: 3, enabled: true, conversionRole: "value" },
          { type: "faq", variant: "answers", priority: 4, enabled: true, conversionRole: "objection" },
          { type: "cta", variant: "primary", priority: 5, enabled: true, conversionRole: "conversion" }
        ]
      };
    }

    if (category.includes("advocacia") || category.includes("advogado")) {
      return {
        type: "lead-generation",
        objective: "gerar contatos qualificados",
        sections: [
          { type: "hero", variant: "authority", priority: 1, enabled: true, conversionRole: "attention" },
          { type: "expertise", variant: "authority", priority: 2, enabled: true, conversionRole: "authority" },
          { type: "services", variant: "practice-areas", priority: 3, enabled: true, conversionRole: "value" },
          { type: "faq", variant: "answers", priority: 4, enabled: true, conversionRole: "objection" },
          { type: "cta", variant: "primary", priority: 5, enabled: true, conversionRole: "conversion" }
        ]
      };
    }

    return {
      type: "conversion",
      objective: "gerar contatos e apresentar o negócio",
      sections: [
        { type: "hero", variant: "conversion", priority: 1, enabled: true, conversionRole: "attention" },
        { type: "services", variant: "cards", priority: 2, enabled: true, conversionRole: "value" },
        { type: "about", variant: "trust", priority: 3, enabled: true, conversionRole: "trust" },
        { type: "cta", variant: "primary", priority: 4, enabled: true, conversionRole: "conversion" }
      ]
    };
  }

  private fallback(category: string): DesignSystem {
    const base = this.baseForCategory(category);

    const prdFallback: PRD = {
      business: {
        businessName: '',
        category,
        city: '',
        positioning: '',
        valueProposition: '',
        targetAudience: '',
        objective: ''
      },
      strategy: {
        primaryGoal: '',
        secondaryGoals: [],
        primaryCTA: '',
        conversionStrategy: ''
      },
      ux: {
        informationArchitecture: [],
        navigation: [],
        userJourney: [],
        sectionOrder: []
      },
      content: {
        heroHeadline: '',
        heroSubheadline: '',
        primaryCTA: '',
        services: [],
        benefits: [],
        faq: [],
        contactContent: ''
      },
      design: {
        visualDirection: '',
        mood: '',
        colorStrategy: '',
        typographyStrategy: '',
        spacingStrategy: '',
        componentStrategy: '',
        imageStrategy: ''
      },
      responsive: {
        desktop: '',
        tablet: '',
        mobile: ''
      },
      seo: {
        title: '',
        metaDescription: '',
        keywords: [],
        headingStrategy: ''
      }
    };

    return {
      ...base,
      pageArchitecture: this.buildFallbackArchitecture(prdFallback)
    };
  }

  private baseForCategory(category: string): DesignSystem {
    const base: Record<string, any> = {
      hamburgueria: {
        visualStyle: 'Urbano moderno', layoutStyle: 'Bold com fotografia forte',
        colors: { primary: '#FF6B35', secondary: '#F7931E', accent: '#FFD23F', background: '#FFFFFF', surface: '#F8F8F8', text: '#1A1A1A', textMuted: '#666666', border: '#E5E5E5' },
        typography: { fontFamily: 'Montserrat, sans-serif', headingFont: 'Bebas Neue, sans-serif', baseSize: '16px', headingSizes: { h1: '4rem', h2: '3rem', h3: '2.25rem', h4: '1.75rem' }, lineHeight: '1.5', letterSpacing: '0.5px' },
        hero: { background: 'linear-gradient(135deg, #FF6B35 0%, #F7931E 100%)', minHeight: '700px', padding: '8rem 2rem', textAlign: 'center' }
      },
      restaurante: {
        visualStyle: 'Moderno apetitoso', layoutStyle: 'Grid com imagens',
        colors: { primary: '#D32F2F', secondary: '#F57C00', accent: '#FFC107', background: '#FFFFFF', surface: '#F5F5F5', text: '#212121', textMuted: '#757575', border: '#E0E0E0' },
        typography: { fontFamily: 'Inter, sans-serif', headingFont: 'Playfair Display, serif', baseSize: '16px', headingSizes: { h1: '3.5rem', h2: '2.5rem', h3: '2rem', h4: '1.5rem' }, lineHeight: '1.6', letterSpacing: 'normal' },
        hero: { background: 'linear-gradient(135deg, #D32F2F 0%, #F57C00 100%)', minHeight: '600px', padding: '6rem 2rem', textAlign: 'center' }
      },
      clinica: {
        visualStyle: 'Limpo profissional', layoutStyle: 'Minimalista',
        colors: { primary: '#0288D1', secondary: '#03A9F4', accent: '#4FC3F7', background: '#FFFFFF', surface: '#F5F9FC', text: '#263238', textMuted: '#607D8B', border: '#CFD8DC' },
        typography: { fontFamily: 'Open Sans, sans-serif', headingFont: 'Roboto, sans-serif', baseSize: '16px', headingSizes: { h1: '3rem', h2: '2.25rem', h3: '1.75rem', h4: '1.5rem' }, lineHeight: '1.7', letterSpacing: 'normal' },
        hero: { background: 'linear-gradient(135deg, #0288D1 0%, #03A9F4 100%)', minHeight: '500px', padding: '6rem 2rem', textAlign: 'center' }
      },
      advocacia: {
        visualStyle: 'Sóbrio elegante', layoutStyle: 'Clássico estruturado',
        colors: { primary: '#1A237E', secondary: '#3949AB', accent: '#C5A572', background: '#FFFFFF', surface: '#FAFAFA', text: '#212121', textMuted: '#616161', border: '#BDBDBD' },
        typography: { fontFamily: 'Merriweather, serif', headingFont: 'Playfair Display, serif', baseSize: '17px', headingSizes: { h1: '3.25rem', h2: '2.5rem', h3: '2rem', h4: '1.625rem' }, lineHeight: '1.8', letterSpacing: '0.3px' },
        hero: { background: 'linear-gradient(135deg, #1A237E 0%, #3949AB 100%)', minHeight: '600px', padding: '8rem 2rem', textAlign: 'center' }
      },
      imobiliaria: {
        visualStyle: 'Moderno clean', layoutStyle: 'Grid com imagens grandes',
        colors: { primary: '#2E7D32', secondary: '#66BB6A', accent: '#FFA726', background: '#FFFFFF', surface: '#F5F5F5', text: '#212121', textMuted: '#757575', border: '#E0E0E0' },
        typography: { fontFamily: 'Inter, sans-serif', headingFont: 'Poppins, sans-serif', baseSize: '16px', headingSizes: { h1: '3.5rem', h2: '2.75rem', h3: '2.25rem', h4: '1.75rem' }, lineHeight: '1.6', letterSpacing: 'normal' },
        hero: { background: 'linear-gradient(135deg, #2E7D32 0%, #66BB6A 100%)', minHeight: '600px', padding: '6rem 2rem', textAlign: 'center' }
      }
    };
    const p = base[category] || base.restaurante;
    const shared = {
      spacing: { xs: '0.5rem', sm: '1rem', md: '1.5rem', lg: '2rem', xl: '3rem', xxl: '4rem' },
      borderRadius: { sm: '4px', md: '8px', lg: '12px', xl: '16px', full: '9999px' },
      shadows: { sm: '0 1px 3px rgba(0,0,0,0.08)', md: '0 4px 12px rgba(0,0,0,0.12)', lg: '0 10px 25px rgba(0,0,0,0.15)', xl: '0 20px 50px rgba(0,0,0,0.2)' },
      buttons: {
        primary: { background: p.colors.primary, color: '#FFFFFF', padding: '1rem 2rem', borderRadius: '8px', fontSize: '1rem', fontWeight: '600', hoverEffect: 'transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.15)' },
        secondary: { background: 'transparent', color: p.colors.primary, padding: '1rem 2rem', borderRadius: '8px', fontSize: '1rem', fontWeight: '600', border: `2px solid ${p.colors.primary}` }
      },
      cards: { background: p.colors.background, padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
      sections: { padding: '5rem 2rem', maxWidth: '1200px', gap: '2rem' },
      navigation: { background: p.colors.background, padding: '1rem 2rem', position: 'sticky', boxShadow: '0 2px 4px rgba(0,0,0,0.08)' },
      footer: { background: p.colors.text, color: '#FFFFFF', padding: '3rem 2rem' }
    };
    return { ...p, ...shared };
  }
}

export const websiteCreativeDirectorService = new WebsiteCreativeDirectorService();











