// src/services/prospecting/websiteOpportunityScoringService.ts

import { prisma } from '../../modules/mercadoLivre/lib/prisma';
import { OpportunityScore, WebsiteOpportunityStatus } from '../../types/prospecting.types';

export class WebsiteOpportunityScoringService {
  
  async calculateScore(prospectId: string): Promise<OpportunityScore> {
    const prospect = await prisma.websiteProspect.findUnique({
      where: { id: prospectId },
      include: { identity: true },
    });

    if (!prospect) {
      throw new Error('PROSPECT_NOT_FOUND');
    }

    const reasons: string[] = [];
    let score = 0;

    const websiteStatus = prospect.websiteOpportunityStatus as WebsiteOpportunityStatus;

    switch (websiteStatus) {
      case 'NO_WEBSITE':
        score = 95;
        reasons.push('Empresa nao possui site');
        reasons.push('Oportunidade maxima de presenca digital');
        break;
      
      case 'WEBSITE_OFFLINE':
        score = 85;
        reasons.push('Site fora do ar');
        reasons.push('Clientes nao conseguem acessar informacoes');
        break;
      
      case 'WEBSITE_BROKEN':
        score = 80;
        reasons.push('Site com erros criticos');
        reasons.push('Experiencia do usuario comprometida');
        break;
      
      case 'WEBSITE_OUTDATED':
        score = 70;
        reasons.push('Site desatualizado');
        reasons.push('Design e tecnologia defasados');
        break;
      
      case 'WEBSITE_NEEDS_IMPROVEMENT':
        score = 50;
        reasons.push('Site com problemas de SEO/acessibilidade');
        reasons.push('Oportunidade de otimizacao');
        break;
      
      case 'WEBSITE_GOOD':
        score = 20;
        reasons.push('Site funcional e de qualidade');
        reasons.push('Baixa prioridade de substituicao');
        break;
      
      case 'ERROR':
        score = 0;
        reasons.push('Nao foi possivel auditar o site');
        reasons.push('Nao abordar como oportunidade ate concluir nova auditoria');
        break;
      case 'UNKNOWN':
      default:
        score = 40;
        reasons.push('Status do site desconhecido');
        break;
    }

    if (prospect.rating && prospect.rating > 0) {
      score = Math.min(100, score + 3);
      reasons.push(`Empresa possui avaliacao positiva (${prospect.rating.toFixed(1)})`);
    }

    if (prospect.phone || prospect.whatsapp) {
      score = Math.min(100, score + 2);
      reasons.push('Contato disponivel para abordagem');
    }

    if (prospect.city && prospect.state) {
      reasons.push(`Negocio local identificado (${prospect.city}/${prospect.state})`);
    }

    const priority = score >= 80 ? 'HIGH' : score >= 50 ? 'MEDIUM' : 'LOW';

    const recommendedAction = this.getRecommendedAction(websiteStatus, score);

    const result: OpportunityScore = {
      score,
      status: websiteStatus || 'UNKNOWN',
      priority,
      reasons,
      recommendedAction,
    };

    await prisma.websiteProspect.update({
      where: { id: prospectId },
      data: {
        websiteOpportunityScore: score,
        websiteOpportunityStatus: websiteStatus,
        priority,
      },
    });

    return result;
  }

  private getRecommendedAction(status: WebsiteOpportunityStatus, score: number): string {
    switch (status) {
      case 'NO_WEBSITE':
        return 'Criar site institucional ou landing page com foco em conversao local';
      case 'WEBSITE_OFFLINE':
        return 'Oferecer reconstrucao urgente para restaurar presenca digital';
      case 'WEBSITE_BROKEN':
        return 'Propor redesign completo com correcao de erros';
      case 'WEBSITE_OUTDATED':
        return 'Apresentar modernizacao com SEO e mobile-first';
      case 'WEBSITE_NEEDS_IMPROVEMENT':
        return 'Sugerir otimizacao de conversao e performance';
      case 'WEBSITE_GOOD':
        return 'Nao priorizar para substituicao; monitorar ou oferecer servicos complementares';
      case 'ERROR':
        return 'Repetir auditoria antes de abordar comercialmente';
      default:
        return 'Realizar auditoria completa antes de abordar';
    }
  }

  async batchScore(prospectIds: string[]): Promise<OpportunityScore[]> {
    const results: OpportunityScore[] = [];
    
    for (const id of prospectIds) {
      try {
        const score = await this.calculateScore(id);
        results.push(score);
      } catch (error: any) {
        console.error(`[Scoring] Failed for ${id}:`, error.message);
      }
    }

    return results;
  }
}

export const websiteOpportunityScoringService = new WebsiteOpportunityScoringService();