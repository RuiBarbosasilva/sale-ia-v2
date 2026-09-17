// src/services/website/websiteContentService.ts
export interface CustomContent {
  headline?: string;
  slogan?: string;
  description?: string;
  services?: Array<string | { title: string; description: string }>;
  differentials?: string[];
  benefits?: Array<string | { title: string; description: string }>;
  faq?: Array<{ question: string; answer: string }>;
  ctaText?: string;
  tone?: string;
  targetAudience?: string;
}

export class WebsiteContentService {
  /**
   * Gera conteudo do site. Parametro opcional `custom` permite usar dados do briefing.
   * Retrocompativel: chamadas com 5 argumentos continuam identicas ao comportamento antigo.
   */
  generateContent(businessName: string, segment: string, city: string, creatorType: string, phone?: string, custom?: CustomContent) {
    const cleanPhone = phone?.replace(/\D/g, '') || '';
    const whatsappLink = cleanPhone.length >= 10 ? 'https://wa.me/55' + cleanPhone : '#';

    // SERVICES: briefing > padrao
    let services: Array<{ title: string; description: string }>;
    if (custom?.services && custom.services.length > 0) {
      services = custom.services.slice(0, 6).map((s) => {
        if (typeof s === 'string') {
          return { title: s, description: `Solucao completa de ${s.toLowerCase()} com atendimento profissional e dedicado.` };
        }
        return { title: s.title, description: s.description };
      });
    } else {
      services = [
        { title: 'Serviço Principal', description: 'Solução completa e profissional' },
        { title: 'Atendimento Personalizado', description: 'Foco nas suas necessidades' },
        { title: 'Suporte Dedicado', description: 'Acompanhamento contínuo' }
      ];
    }

    // BENEFITS: briefing (differentials ou benefits) > padrao
    let benefits: Array<{ title: string; description: string }>;
    if (custom?.benefits && custom.benefits.length > 0) {
      benefits = custom.benefits.slice(0, 3).map((b) => {
        if (typeof b === 'string') {
          return { title: b, description: 'Um dos nossos grandes diferenciais.' };
        }
        return { title: b.title, description: b.description };
      });
    } else if (custom?.differentials && custom.differentials.length > 0) {
      benefits = custom.differentials.slice(0, 3).map((d) => ({ title: d, description: 'Diferencial que garante a melhor experiencia.' }));
    } else {
      benefits = [
        { title: 'Qualidade Garantida', description: 'Padrão excellence em todos os serviços' },
        { title: 'Equipe Especializada', description: 'Profissionais qualificados' },
        { title: 'Resultados Comprovados', description: 'Histórico de sucesso' }
      ];
    }

    // FAQ: briefing > padrao
    const faq = custom?.faq && custom.faq.length > 0
      ? custom.faq.slice(0, 4)
      : [
          { question: 'Como solicitar orçamento?', answer: 'Entre em contato pelo WhatsApp ou telefone.' },
          { question: 'Qual o prazo de atendimento?', answer: 'Atendimento rápido, conforme disponibilidade.' },
          { question: 'Atendem em minha região?', answer: `Atendemos ${city} e região.` }
        ];

    // TEXTOS PRINCIPAIS: briefing > padrao
    const heroHeadline = custom?.headline || custom?.slogan || 'Soluções profissionais para seu negócio';
    const heroSubtitle = `${businessName} - Excelência em ${segment} em ${city}`;
    const aboutText = custom?.description && custom.description.trim().length > 0
      ? custom.description
      : `A ${businessName} é referência em ${segment} em ${city}, oferecendo serviços de qualidade com equipe especializada.`;
    const ctaText = custom?.ctaText || 'Fale Conosco';
    const metaTitle = `${businessName} - ${segment} em ${city}`;
    const metaDescription = `Empresa especializada em ${segment} em ${city}. Entre em contato.`;

    return {
      heroHeadline,
      heroSubtitle,
      ctaText,
      aboutText,
      services,
      benefits,
      faq,
      metaTitle,
      metaDescription,
      whatsappLink
    };
  }
}
export const websiteContentService = new WebsiteContentService();

// RB FACTORY - CONTENT TRUTHFULNESS GUARD
// Nunca inventar: avaliacoes, numeros, certificados, premios,
// medicos, advogados, credenciais, precos, horarios, enderecos,
// estatisticas, depoimentos reais.
const CONTENT_TRUTHFULNESS_RULES = {
  neverInvent: ['reviews','ratings','clientCount','yearsOfExperience','certifications','awards','doctorNames','lawyerNames','credentials','prices','schedules','addresses','statistics','realTestimonials'],
  placeholderPolicy: 'generic-non-factual',
  socialProofPolicy: 'only-if-provided'
};

function applyTruthfulnessGuard(content: any, providedFacts: any): any {
  if (!content) return content;
  if (content.testimonials && (!providedFacts || !providedFacts.testimonials)) { content.testimonials = []; content.testimonialsOmitted = true; }
  if (content.stats && (!providedFacts || !providedFacts.stats)) { content.stats = []; content.statsOmitted = true; }
  return content;
}
