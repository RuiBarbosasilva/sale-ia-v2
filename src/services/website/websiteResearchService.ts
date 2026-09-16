// src/services/website/websiteResearchService.ts
import { ResearchResult, CompetitorAnalysis, ResearchInsight } from '../../types/websiteV2';
import { websiteAIEnhancerService } from './websiteAIEnhancerService';

export class WebsiteResearchService {
  async analyze(briefing: any, prospect: any): Promise<ResearchResult> {
    const category = briefing.category || prospect.segment || 'negócio';
    const city = briefing.city || prospect.city || 'cidade';
    const businessName = briefing.businessName || prospect.companyName || 'Empresa';
    console.log(`[Research] Analisando mercado para ${businessName} (${category} em ${city})`);

    if (websiteAIEnhancerService.isAvailable) {
      try {
        const prompt = this.buildPrompt(briefing, prospect);
        const data = await websiteAIEnhancerService.generateJSON(prompt, 'research');
        if (data) return this.normalize(data, briefing, prospect);
      } catch (e: any) {
        console.error('[Research] IA falhou, usando fallback:', e?.message);
      }
    }
    return this.fallback(briefing, prospect);
  }

  private buildPrompt(briefing: any, prospect: any): string {
    return `Voce e especialista em pesquisa de mercado e estrategia digital para websites profissionais brasileiros.

NEGOCIO:
- Nome: ${briefing.businessName || prospect.companyName}
- Segmento: ${briefing.category || prospect.segment}
- Cidade: ${briefing.city || prospect.city}
- Descricao: ${briefing.description || 'Nao informada'}
- Servicos: ${Array.isArray(briefing.services) ? briefing.services.join(', ') : briefing.services || ''}
- Diferenciais: ${Array.isArray(briefing.differentials) ? briefing.differentials.join(', ') : briefing.differentials || ''}
- Publico-alvo: ${briefing.targetAudience || ''}

Retorne JSON estrito:
{
  "marketInsights": {"topic":"...", "findings":["..."], "opportunities":["..."], "risks":["..."]},
  "competitorInsights": [{"name":"Nome generico (NUNCA real)", "segment":"...", "strengths":["..."], "weaknesses":["..."], "opportunities":["..."]}],
  "designReferences": {"topic":"...", "findings":["..."], "opportunities":["..."]},
  "conversionInsights": {"topic":"...", "findings":["..."], "opportunities":["..."]},
  "recommendedStructure": ["Hero","..."],
  "recommendedVisualDirection": "descricao curta",
  "summary": "resumo executivo max 100 palavras"
}

Regras: 2-4 concorrentes genericos, findings 2-4 por insight, NUNCA copie marcas reais.`;
  }

  private normalize(data: any, briefing: any, prospect: any): ResearchResult {
    return {
      marketInsights: data.marketInsights || { topic: 'Mercado', findings: [], opportunities: [] },
      competitorInsights: Array.isArray(data.competitorInsights) ? data.competitorInsights : [],
      designReferences: data.designReferences || { topic: 'Design', findings: [], opportunities: [] },
      conversionInsights: data.conversionInsights || { topic: 'Conversão', findings: [], opportunities: [] },
      recommendedStructure: Array.isArray(data.recommendedStructure) ? data.recommendedStructure : ['Hero','Sobre','Serviços','Contato'],
      recommendedVisualDirection: data.recommendedVisualDirection || 'Design profissional',
      summary: data.summary || 'Pesquisa concluída'
    };
  }

  private fallback(briefing: any, prospect: any): ResearchResult {
    const category = (briefing.category || prospect.segment || 'negócio').toLowerCase();
    const patterns: Record<string, any> = {
      restaurante: { structure: ['Hero','Cardápio','Galeria','Sobre','Depoimentos','Localização','Contato'], visual: 'Visual apetitoso com fotografia forte e cores quentes' },
      hamburgueria: { structure: ['Hero','Cardápio','Combos','Sobre','Depoimentos','Localização','Contato'], visual: 'Visual urbano moderno com fotografia impactante' },
      clinica: { structure: ['Hero','Especialidades','Equipe','Estrutura','Depoimentos','Agendamento','Contato'], visual: 'Design limpo e profissional transmitindo confiança' },
      advocacia: { structure: ['Hero','Áreas de Atuação','Equipe','Casos de Sucesso','Blog','Contato'], visual: 'Design sóbrio e elegante com tipografia clássica' },
      imobiliaria: { structure: ['Hero','Imóveis em Destaque','Busca','Sobre','Depoimentos','Contato'], visual: 'Design moderno com imagens grandes e foco em imóveis' }
    };
    const p = patterns[category] || patterns.restaurante;
    return {
      marketInsights: { topic: 'Mercado de ' + category, findings: ['Clientes buscam presença online profissional','Prova social é essencial','Mobile-first é obrigatório'], opportunities: ['Design moderno','Conteúdo de qualidade','CTAs estratégicos'] },
      competitorInsights: [{ name: 'Concorrente A', segment: category, strengths: ['Presença online'], weaknesses: ['Design desatualizado'], opportunities: ['Modernizar visual'] }],
      designReferences: { topic: 'Design para ' + category, findings: ['Fotografia de qualidade','Tipografia clara','Espaçamento generoso'], opportunities: ['Hero impactante','Navegação intuitiva'] },
      conversionInsights: { topic: 'Conversão para ' + category, findings: ['CTA proeminente','WhatsApp flutuante','Formulário simples'], opportunities: ['Botão de ação imediato'] },
      recommendedStructure: p.structure,
      recommendedVisualDirection: p.visual,
      summary: `Pesquisa concluída para ${briefing.businessName || prospect.companyName} em ${category}.`
    };
  }
}

export const websiteResearchService = new WebsiteResearchService();
