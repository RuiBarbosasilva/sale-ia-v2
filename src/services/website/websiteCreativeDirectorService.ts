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
    return `Voce e Diretor de Arte especializado em design de websites comerciais brasileiros.

SEGMENTO: ${prd.business.category}
DIRECAO: ${prd.design.visualDirection}
MOOD: ${prd.design.mood}

Crie Design System em JSON com:
{
  "visualStyle":"...",
  "layoutStyle":"...",
  "colors":{"primary":"#hex","secondary":"#hex","accent":"#hex","background":"#hex","surface":"#hex","text":"#hex","textMuted":"#hex","border":"#hex"},
  "typography":{"fontFamily":"...","headingFont":"...","baseSize":"16px","headingSizes":{"h1":"...","h2":"...","h3":"...","h4":"..."},"lineHeight":"1.6","letterSpacing":"normal"},
  "spacing":{"xs":"0.5rem","sm":"1rem","md":"1.5rem","lg":"2rem","xl":"3rem","xxl":"4rem"},
  "borderRadius":{"sm":"4px","md":"8px","lg":"12px","xl":"16px","full":"9999px"},
  "shadows":{"sm":"...","md":"...","lg":"...","xl":"..."}
}

Regras: cores apropriadas para segmento (hamburgueria=vibrante, clinica=suave, advocacia=sóbrio), hex válidos, tipografia legível.`;
  }

  private normalize(data: any, prd: PRD): DesignSystem {
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
      sections: base.sections, navigation: base.navigation, footer: base.footer
    };
  }

  private fallback(category: string): DesignSystem { return this.baseForCategory(category); }

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
