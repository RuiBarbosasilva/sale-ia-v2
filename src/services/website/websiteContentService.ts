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

function normalize(value: string): string {
  return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function segmentCopy(segment: string, city: string, businessName: string) {
  const s = normalize(segment);
  if (s.includes('pet')) return {
    headline: 'Tudo para o cuidado do seu pet',
    subtitle: `Cuidados e produtos para pets em ${city}`,
    services: [
      { title: 'Produtos para pets', description: 'Opções para alimentação, higiene e bem-estar.' },
      { title: 'Cuidados e atendimento', description: 'Atendimento para orientar você nas necessidades do seu pet.' },
      { title: 'Higiene e bem-estar', description: 'Soluções para uma rotina mais prática e confortável.' }
    ],
    benefits: [
      { title: 'Atendimento próximo', description: `Atendimento local para clientes de ${city}.` },
      { title: 'Praticidade', description: 'Informações e contato reunidos em um único lugar.' },
      { title: 'Cuidado com os pets', description: 'Comunicação clara sobre produtos e serviços disponíveis.' }
    ],
    faq: [
      { question: 'Como posso falar com a loja?', answer: 'Use o WhatsApp ou os canais de contato disponíveis nesta página.' },
      { question: 'Quais produtos estão disponíveis?', answer: 'Consulte a loja para confirmar estoque e opções atuais.' },
      { question: 'Onde fica o atendimento?', answer: `Consulte o endereço informado pela empresa em ${city}.` }
    ]
  };
  if (s.includes('hamburg') || s.includes('burger')) return {
    headline: 'Seu próximo burger começa aqui',
    subtitle: `Hambúrgueres e opções da casa em ${city}`,
    services: [
      { title: 'Hambúrgueres', description: 'Conheça as opções do cardápio e escolha seu próximo pedido.' },
      { title: 'Combos e acompanhamentos', description: 'Confira combinações e acompanhamentos disponíveis.' },
      { title: 'Pedidos', description: 'Entre em contato para consultar opções, horários e formas de pedido.' }
    ],
    benefits: [
      { title: 'Cardápio fácil de consultar', description: 'Encontre as principais opções da casa em poucos cliques.' },
      { title: 'Atendimento local', description: `Contato direto para clientes de ${city}.` },
      { title: 'Pedido direto', description: 'Acesse o canal de contato para consultar e fazer seu pedido.' }
    ],
    faq: [
      { question: 'Como faço meu pedido?', answer: 'Acesse o WhatsApp ou o canal de pedidos informado pela empresa.' },
      { question: 'Quais opções estão disponíveis?', answer: 'Consulte o cardápio atualizado da casa.' },
      { question: `Vocês atendem em ${city}?`, answer: `Consulte a disponibilidade de atendimento e entrega em ${city}.` }
    ]
  };
  if (s.includes('restaurante') || s.includes('pizzaria') || s.includes('lanchonete') || s.includes('cafe')) return {
    headline: 'Uma experiência para descobrir',
    subtitle: `Cardápio e atendimento em ${city}`,
    services: [
      { title: 'Cardápio', description: 'Conheça as opções disponíveis e escolha o que deseja pedir.' },
      { title: 'Pedidos e reservas', description: 'Entre em contato para consultar disponibilidade e condições de atendimento.' },
      { title: 'Atendimento', description: `Informações práticas para clientes de ${city}.` }
    ],
    benefits: [
      { title: 'Informação clara', description: 'Cardápio e canais de contato organizados.' },
      { title: 'Atendimento local', description: `Contato direto para clientes de ${city}.` },
      { title: 'Praticidade', description: 'Encontre rapidamente as informações que precisa.' }
    ],
    faq: [
      { question: 'Como consultar o cardápio?', answer: 'Consulte as opções apresentadas ou fale diretamente com a empresa.' },
      { question: 'Posso fazer um pedido?', answer: 'Use o canal de contato informado para confirmar pedidos e disponibilidade.' },
      { question: `Há atendimento em ${city}?`, answer: `Consulte horários e disponibilidade para ${city}.` }
    ]
  };
  return {
    headline: `Conheça a ${businessName}`,
    subtitle: `${segment || 'Serviços'} em ${city}`,
    services: [
      { title: 'Serviços e soluções', description: 'Conheça os serviços oferecidos e escolha a opção adequada para você.' },
      { title: 'Atendimento', description: `Fale diretamente com a empresa em ${city} para tirar dúvidas e consultar disponibilidade.` },
      { title: 'Contato', description: 'Encontre os canais de contato e solicite informações.' }
    ],
    benefits: [
      { title: 'Informação organizada', description: 'Serviços, contato e informações importantes reunidos em um só lugar.' },
      { title: 'Atendimento direto', description: 'Canal rápido para dúvidas, orçamento ou informações.' },
      { title: `Atendimento em ${city}`, description: 'Informações direcionadas ao público local.' }
    ],
    faq: [
      { question: 'Como entrar em contato?', answer: 'Use o WhatsApp, telefone ou outro canal informado pela empresa.' },
      { question: 'Como consultar os serviços?', answer: 'Veja as opções apresentadas nesta página ou fale com a empresa.' },
      { question: `Vocês atendem em ${city}?`, answer: `Consulte a disponibilidade de atendimento em ${city}.` }
    ]
  };
}

export class WebsiteContentService {
  generateContent(businessName: string, segment: string, city: string, creatorType: string, phone?: string, custom?: CustomContent) {
    const cleanPhone = phone?.replace(/\D/g, '') || '';
    const whatsappLink = cleanPhone.length >= 10 ? 'https://wa.me/55' + cleanPhone : '#';
    const copy = segmentCopy(segment, city, businessName);
    const services = custom?.services?.length
      ? custom.services.slice(0, 6).map(s => typeof s === 'string'
        ? { title: s, description: `Informações sobre ${s.toLowerCase()} e como contratar.` }
        : { title: s.title, description: s.description })
      : copy.services;
    const benefits = custom?.benefits?.length
      ? custom.benefits.slice(0, 4).map(b => typeof b === 'string'
        ? { title: b, description: 'Informação baseada no briefing fornecido para esta empresa.' }
        : { title: b.title, description: b.description })
      : custom?.differentials?.length
        ? custom.differentials.slice(0, 4).map(d => ({ title: d, description: 'Diferencial informado no briefing da empresa.' }))
        : copy.benefits;
    const faq = custom?.faq?.length ? custom.faq.slice(0, 4) : copy.faq;
    const heroHeadline = custom?.headline || custom?.slogan || copy.headline;
    const heroSubtitle = custom?.targetAudience ? `${copy.subtitle} — pensado para ${custom.targetAudience}` : copy.subtitle;
    const aboutText = custom?.description?.trim()
      ? custom.description.trim()
      : `${businessName} atua no segmento de ${segment || 'negócios locais'} em ${city}. Consulte os canais de contato para conhecer os serviços, condições e disponibilidade atuais.`;
    const ctaText = custom?.ctaText || 'Falar com a empresa';
    const metaTitle = `${businessName} - ${segment || 'serviços'} em ${city}`;
    const metaDescription = `${businessName} em ${city}. Consulte serviços, informações e canais de contato.`;
    return { heroHeadline, heroSubtitle, ctaText, aboutText, services, benefits, faq, metaTitle, metaDescription, whatsappLink };
  }
}
export const websiteContentService = new WebsiteContentService();

// RB FACTORY - CONTENT TRUTHFULNESS GUARD
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
