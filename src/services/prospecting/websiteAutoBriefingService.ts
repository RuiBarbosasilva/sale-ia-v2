// src/services/prospecting/websiteAutoBriefingService.ts

import { prisma } from '../../modules/mercadoLivre/lib/prisma';

export class WebsiteAutoBriefingService {
  
  async generateBriefing(prospectId: string): Promise<any> {
    const prospect = await prisma.websiteProspect.findUnique({
      where: { id: prospectId },
      include: { identity: true },
    });

    if (!prospect) {
      throw new Error('PROSPECT_NOT_FOUND');
    }

    const briefing = {
      businessName: prospect.companyName,
      segment: prospect.segment || prospect.segment,
      location: {
        city: prospect.city,
        state: prospect.state,
        address: prospect.address,
      },
      contact: {
        phone: prospect.phone,
        whatsapp: prospect.whatsapp,
        email: prospect.email,
        website: prospect.currentWebsite,
      },
      description: prospect.description || null,
      businessHours: prospect.businessHours || null,
      rating: prospect.rating && prospect.rating > 0 ? prospect.rating : null,
      reviewCount: prospect.reviewCount && prospect.reviewCount > 0 ? prospect.reviewCount : null,
      
      objective: this.inferObjective(prospect),
      audience: this.inferAudience(prospect),
      positioning: this.inferPositioning(prospect),
      conversionGoal: this.inferConversionGoal(prospect),
      
      knownFacts: this.collectKnownFacts(prospect),
      unknownInformation: this.collectUnknownInfo(prospect),
      
      recommendedArchitecture: this.recommendArchitecture(prospect),
      
      factualClaims: [],
      contentConstraints: [
        'Nao inventar depoimentos de clientes',
        'Nao inventar numeros ou estatisticas',
        'Nao inventar precos ou promocoes',
        'Nao inventar certificacoes ou premios',
        'Usar apenas informacoes confirmadas ou linguagem neutra',
      ],
    };

    return briefing;
  }

  private inferObjective(prospect: any): string {
    if (!prospect.currentWebsite || prospect.websiteOpportunityStatus === 'NO_WEBSITE') {
      return 'Estabelecer presenca digital e captar clientes locais';
    }
    if (prospect.websiteOpportunityStatus === 'WEBSITE_OUTDATED') {
      return 'Modernizar presenca digital e melhorar conversao';
    }
    return 'Fortalecer presenca digital e gerar leads qualificados';
  }

  private inferAudience(prospect: any): string {
    const segment = (prospect.segment || '').toLowerCase();
    
    if (segment.includes('restaurante') || segment.includes('hamburgueria') || segment.includes('pizzaria')) {
      return 'Consumidores locais buscando experiencias gastronomicas';
    }
    if (segment.includes('clinica') || segment.includes('saude') || segment.includes('odonto')) {
      return 'Pacientes buscando servicos de saude de confianca';
    }
    if (segment.includes('advoc') || segment.includes('juridico')) {
      return 'Clientes buscando assessoria juridica especializada';
    }
    if (segment.includes('imob')) {
      return 'Compradores e investidores imobiliarios';
    }
    
    return 'Clientes locais buscando servicos profissionais';
  }

  private inferPositioning(prospect: any): string {
    if (prospect.rating && prospect.rating >= 4.5) {
      return 'Negocio bem avaliado com reputacao consolidada';
    }
    if (prospect.rating && prospect.rating >= 4.0) {
      return 'Negocio com boa reputacao e potencial de crescimento';
    }
    return 'Negocio local com oportunidade de destaque digital';
  }

  private inferConversionGoal(prospect: any): string {
    const segment = (prospect.segment || '').toLowerCase();
    
    if (segment.includes('restaurante') || segment.includes('hamburgueria')) {
      return 'Reservas ou pedidos via WhatsApp';
    }
    if (segment.includes('clinica') || segment.includes('saude')) {
      return 'Agendamento de consultas';
    }
    if (segment.includes('advoc')) {
      return 'Agendamento de consulta juridica';
    }
    if (segment.includes('imob')) {
      return 'Contato para visita ou avaliacao';
    }
    
    return 'Contato direto via WhatsApp ou formulario';
  }

  private collectKnownFacts(prospect: any): string[] {
    const facts: string[] = [];
    
    if (prospect.companyName) facts.push(`Nome da empresa: ${prospect.companyName}`);
    if (prospect.city && prospect.state) facts.push(`Localizacao: ${prospect.city}/${prospect.state}`);
    if (prospect.address) facts.push(`Endereco: ${prospect.address}`);
    if (prospect.phone) facts.push(`Telefone: ${prospect.phone}`);
    if (prospect.currentWebsite) facts.push(`Site atual: ${prospect.currentWebsite}`);
    if (prospect.rating && prospect.rating > 0) {
      facts.push(`Avaliacao Google: ${prospect.rating.toFixed(1)} (${prospect.reviewCount || 0} avaliacoes)`);
    }
    if (prospect.businessHours) facts.push(`Horario de funcionamento disponivel`);
    
    return facts;
  }

  private collectUnknownInfo(prospect: any): string[] {
    const unknown: string[] = [];
    
    if (!prospect.email) unknown.push('E-mail de contato');
    if (!prospect.description) unknown.push('Descricao detalhada do negocio');
    if (!prospect.businessHours) unknown.push('Horario de funcionamento');
    if (!prospect.currentWebsite) unknown.push('Site atual');
    
    return unknown;
  }

  private recommendArchitecture(prospect: any): string {
    const segment = (prospect.segment || '').toLowerCase();
    
    if (segment.includes('restaurante') || segment.includes('hamburgueria') || segment.includes('pizzaria')) {
      return 'restaurant-conversion';
    }
    if (segment.includes('clinica') || segment.includes('saude') || segment.includes('odonto')) {
      return 'booking-appointment';
    }
    if (segment.includes('advoc') || segment.includes('juridico')) {
      return 'professional-services';
    }
    if (segment.includes('imob')) {
      return 'catalog-listing';
    }
    
    return 'local-business-lead';
  }
}

export const websiteAutoBriefingService = new WebsiteAutoBriefingService();