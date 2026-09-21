import { DesignSystem } from '../../types/websiteV2';

export interface WebsiteSectionRenderContext {
  businessName: string;
  city: string;
  phone: string;
  designSystem: DesignSystem;
  content: any;
  assets?: any;
}

export interface WebsiteSectionDefinition {
  type: string;
  variant?: string;
  title?: string;
  priority?: number;
  enabled?: boolean;
  conversionRole?: string;
}

export class WebsiteSectionRenderer {

  render(
    section: WebsiteSectionDefinition,
    context: WebsiteSectionRenderContext
  ): string {
    if (section.enabled === false) {
      return '';
    }

    const type = String(section.type || '').toLowerCase().trim();

    switch (type) {
      case 'hero':
        return this.renderHero(context, section);

      case 'services':
        return this.renderServices(context, section);

      case 'products':
        return this.renderProducts(context, section);

      case 'features':
        return this.renderFeatures(context, section);

      case 'benefits':
        return this.renderBenefits(context, section);

      case 'about':
        return this.renderAbout(context, section);

      case 'team':
        return this.renderTeam(context, section);

      case 'process':
        return this.renderProcess(context, section);

      case 'gallery':
        return this.renderGallery(context, section);

      case 'portfolio':
        return this.renderPortfolio(context, section);

      case 'testimonials':
        return this.renderTestimonials(context, section);

      case 'social-proof':
        return this.renderSocialProof(context, section);

      case 'stats':
        return this.renderStats(context, section);

      case 'faq':
        return this.renderFaq(context, section);

      case 'location':
        return this.renderLocation(context, section);

      case 'contact':
        return this.renderContact(context, section);

      case 'booking':
        return this.renderBooking(context, section);

      case 'menu':
        return this.renderMenu(context, section);

      case 'pricing':
        return this.renderPricing(context, section);

      case 'cases':
        return this.renderCases(context, section);

      case 'cta':
        return this.renderCta(context, section);

      case 'highlights':
        return this.renderHighlights(context, section);

      case 'expertise':
        return this.renderExpertise(context, section);

      default:
        return this.renderGeneric(context, section);
    }
  }

  private renderHero(
    context: WebsiteSectionRenderContext,
    section: WebsiteSectionDefinition
  ): string {
    const c = context.content || {};
    const ds = context.designSystem;

    const title =
      c.heroHeadline ||
      `${context.businessName} em ${context.city}`;

    const subtitle =
      c.heroSubtitle ||
      c.heroSubheadline ||
      '';

    const cta =
      c.ctaText ||
      c.primaryCTA ||
      'Entre em contato';

    const image =
      c.heroImage ||
      context.assets?.hero?.url ||
      '';

    return `
<section id="hero" class="wf-section wf-hero wf-hero-${this.variant(section)}">
  <div class="wf-container wf-hero-content">
    <div class="wf-hero-copy">
      <span class="wf-eyebrow">${this.esc(context.businessName)}</span>
      <h1>${this.esc(title)}</h1>
      ${subtitle ? `<p>${this.esc(subtitle)}</p>` : ''}
      <div class="wf-actions">
        <a class="wf-btn wf-btn-primary" href="${this.esc(c.whatsappLink || '#')}" target="_blank" rel="noopener noreferrer" aria-label="${this.esc(cta)} pelo WhatsApp">${this.esc(cta)}</a>
      </div>
    </div>
    ${
      image
        ? `<div class="wf-hero-media"><img src="${this.esc(image)}" alt="${this.esc(title)}" loading="eager"></div>`
        : ''
    }
  </div>
</section>`;
  }

  private renderServices(
    context: WebsiteSectionRenderContext,
    section: WebsiteSectionDefinition
  ): string {
    const items = this.items(context.content?.services);

    if (!items.length) return '';

    const serviceAssets = context.assets?.services || {};

    return this.renderCardSection(
      'services',
      section,
      context,
      items.map((item: any) => {
        const title = String(item.title || '').trim();
        const asset = serviceAssets[title];

        return {
          title,
          description: item.description,
          image: typeof asset === 'string'
            ? asset
            : asset?.url || ''
        };
      })
    );
  }

  private renderProducts(
    context: WebsiteSectionRenderContext,
    section: WebsiteSectionDefinition
  ): string {
    const items = this.items(
      context.content?.products ||
      context.content?.services
    );

    if (!items.length) return '';

    return this.renderCardSection(
      'products',
      section,
      context,
      items.map((item: any) => ({
        title: item.title,
        description: item.description,
        image: item.image,
        price: item.price
      }))
    );
  }

  private renderFeatures(
    context: WebsiteSectionRenderContext,
    section: WebsiteSectionDefinition
  ): string {
    const items = this.items(
      context.content?.features ||
      context.content?.benefits
    );

    if (!items.length) return '';

    return this.renderCardSection(
      'features',
      section,
      context,
      items
    );
  }

  private renderBenefits(
    context: WebsiteSectionRenderContext,
    section: WebsiteSectionDefinition
  ): string {
    const items = this.items(context.content?.benefits);

    if (!items.length) return '';

    return this.renderCardSection(
      'benefits',
      section,
      context,
      items
    );
  }

  private renderAbout(
    context: WebsiteSectionRenderContext,
    section: WebsiteSectionDefinition
  ): string {
    const c = context.content || {};

    const text =
      c.aboutText ||
      c.description ||
      '';

    if (!text) return '';

    return `
<section id="about" class="wf-section wf-about wf-about-${this.variant(section)}">
  <div class="wf-container wf-two-column">
    <div>
      <span class="wf-kicker">${this.esc(section.title || 'Sobre')}</span>
      <h2>${this.esc(section.title || `Sobre ${context.businessName}`)}</h2>
    </div>
    <div>
      <p>${this.esc(text)}</p>
    </div>
  </div>
</section>`;
  }

  private renderTeam(
    context: WebsiteSectionRenderContext,
    section: WebsiteSectionDefinition
  ): string {
    const items = this.items(context.content?.team);

    if (!items.length) return '';

    return this.renderCardSection(
      'team',
      section,
      context,
      items
    );
  }

  private renderProcess(
    context: WebsiteSectionRenderContext,
    section: WebsiteSectionDefinition
  ): string {
    const items = this.items(context.content?.process);

    if (!items.length) return '';

    return this.renderCardSection(
      'process',
      section,
      context,
      items
    );
  }

  private renderGallery(
    context: WebsiteSectionRenderContext,
    section: WebsiteSectionDefinition
  ): string {
    const gallery =
      context.assets?.gallery ||
      context.content?.gallery ||
      [];

    const items = Array.isArray(gallery)
      ? gallery
      : Object.values(gallery);

    if (!items.length) return '';

    return `
<section id="gallery" class="wf-section wf-gallery wf-gallery-${this.variant(section)}">
  <div class="wf-container">
    <div class="wf-section-heading">
      <span class="wf-kicker">${this.esc(section.title || 'Galeria')}</span>
      <h2>${this.esc(section.title || 'Conheça nosso trabalho')}</h2>
    </div>

    <div class="wf-gallery-grid">
      ${items.map((item: any, index: number) => {
        const src = typeof item === 'string' ? item : item.url;
        const alt =
          typeof item === 'string'
            ? `${context.businessName} - imagem ${index + 1}`
            : item.alt || `${context.businessName} - imagem ${index + 1}`;

        if (!src) return '';

        return `
<figure class="wf-gallery-item">
  <img src="${this.esc(src)}" alt="${this.esc(alt)}" width="${Number(item?.width) || 800}" height="${Number(item?.height) || 600}" loading="lazy" decoding="async">
</figure>`;
      }).join('')}
    </div>
  </div>
</section>`;
  }

  private renderPortfolio(
    context: WebsiteSectionRenderContext,
    section: WebsiteSectionDefinition
  ): string {
    return this.renderCardSection(
      'portfolio',
      section,
      context,
      this.items(context.content?.portfolio || context.content?.cases)
    );
  }

  private renderTestimonials(
    context: WebsiteSectionRenderContext,
    section: WebsiteSectionDefinition
  ): string {
    const items = this.items(
      context.content?.testimonials ||
      context.content?.socialProof
    );

    if (!items.length) return '';

    return this.renderCardSection(
      'testimonials',
      section,
      context,
      items
    );
  }

  private renderSocialProof(
    context: WebsiteSectionRenderContext,
    section: WebsiteSectionDefinition
  ): string {
    return this.renderCardSection(
      'social-proof',
      section,
      context,
      this.items(context.content?.socialProof)
    );
  }

  private renderStats(
    context: WebsiteSectionRenderContext,
    section: WebsiteSectionDefinition
  ): string {
    const items = this.items(context.content?.stats);

    if (!items.length) return '';

    return this.renderCardSection(
      'stats',
      section,
      context,
      items
    );
  }

  private renderFaq(
    context: WebsiteSectionRenderContext,
    section: WebsiteSectionDefinition
  ): string {
    const items = this.items(context.content?.faq);

    if (!items.length) return '';

    return `
<section id="faq" class="wf-section wf-faq wf-faq-${this.variant(section)}">
  <div class="wf-container">
    <div class="wf-section-heading">
      <span class="wf-kicker">Dúvidas</span>
      <h2>${this.esc(section.title || 'Perguntas frequentes')}</h2>
    </div>

    <div class="wf-faq-list">
      ${items.map((item: any) => `
<details class="wf-faq-item">
  <summary>${this.esc(item.question || item.title || '')}</summary>
  <div>${this.esc(item.answer || item.description || '')}</div>
</details>`).join('')}
    </div>
  </div>
</section>`;
  }

  private renderLocation(
    context: WebsiteSectionRenderContext,
    section: WebsiteSectionDefinition
  ): string {
    const c = context.content || {};

    const address =
      c.address ||
      context.city;

    const mapUrl =
      c.googleMapsUrl ||
      c.mapUrl ||
      '';

    return `
<section id="location" class="wf-section wf-location wf-location-${this.variant(section)}">
  <div class="wf-container wf-two-column">
    <div>
      <span class="wf-kicker">Localização</span>
      <h2>${this.esc(section.title || `Estamos em ${context.city}`)}</h2>
      <p>${this.esc(address)}</p>
    </div>
    ${
      mapUrl
        ? `<div class="wf-location-map"><a class="wf-btn wf-btn-secondary" href="${this.esc(mapUrl)}" target="_blank" rel="noopener noreferrer">Ver localização</a></div>`
        : ''
    }
  </div>
</section>`;
  }

  private renderContact(
    context: WebsiteSectionRenderContext,
    section: WebsiteSectionDefinition
  ): string {
    const c = context.content || {};

    return `
<section id="contact" class="wf-section wf-contact wf-contact-${this.variant(section)}">
  <div class="wf-container">
    <div class="wf-section-heading">
      <span class="wf-kicker">Contato</span>
      <h2>${this.esc(section.title || 'Fale conosco')}</h2>
    </div>
    <p>${this.esc(c.contactContent || 'Entre em contato para saber mais.')}</p>
    <div class="wf-actions">
      <a class="wf-btn wf-btn-primary" href="${this.esc(c.whatsappLink || '#')}">Entrar em contato</a>
    </div>
  </div>
</section>`;
  }

  private renderBooking(
    context: WebsiteSectionRenderContext,
    section: WebsiteSectionDefinition
  ): string {
    const c = context.content || {};

    return `
<section id="booking" class="wf-section wf-booking wf-booking-${this.variant(section)}">
  <div class="wf-container">
    <div class="wf-section-heading">
      <span class="wf-kicker">Agendamento</span>
      <h2>${this.esc(section.title || 'Agende seu atendimento')}</h2>
    </div>
    <p>${this.esc(c.bookingContent || c.contactContent || 'Entre em contato para verificar disponibilidade.')}</p>
    <a class="wf-btn wf-btn-primary" href="${this.esc(c.whatsappLink || '#')}">${this.esc(c.bookingCTA || c.ctaText || 'Agendar agora')}</a>
  </div>
</section>`;
  }

  private renderMenu(
    context: WebsiteSectionRenderContext,
    section: WebsiteSectionDefinition
  ): string {
    const items = this.items(
      context.content?.menu ||
      context.content?.products
    );

    if (!items.length) return '';

    return this.renderCardSection(
      'menu',
      section,
      context,
      items
    );
  }

  private renderPricing(
    context: WebsiteSectionRenderContext,
    section: WebsiteSectionDefinition
  ): string {
    const items = this.items(context.content?.pricing);

    if (!items.length) return '';

    return this.renderCardSection(
      'pricing',
      section,
      context,
      items
    );
  }

  private renderCases(
    context: WebsiteSectionRenderContext,
    section: WebsiteSectionDefinition
  ): string {
    return this.renderCardSection(
      'cases',
      section,
      context,
      this.items(context.content?.cases)
    );
  }

  private renderCta(
    context: WebsiteSectionRenderContext,
    section: WebsiteSectionDefinition
  ): string {
    const c = context.content || {};

    return `
<section id="cta" class="wf-section wf-cta wf-cta-${this.variant(section)}">
  <div class="wf-container wf-cta-inner">
    <div>
      <span class="wf-kicker">Próximo passo</span>
      <h2>${this.esc(section.title || c.ctaText || 'Vamos conversar?')}</h2>
    </div>
    <a class="wf-btn wf-btn-primary" href="${this.esc(c.whatsappLink || '#')}">${this.esc(c.ctaText || 'Fale conosco')}</a>
  </div>
</section>`;
  }

  private renderHighlights(
    context: WebsiteSectionRenderContext,
    section: WebsiteSectionDefinition
  ): string {
    return this.renderCardSection(
      'highlights',
      section,
      context,
      this.items(
        context.content?.highlights ||
        context.content?.benefits
      )
    );
  }

  private renderExpertise(
    context: WebsiteSectionRenderContext,
    section: WebsiteSectionDefinition
  ): string {
    return this.renderCardSection(
      'expertise',
      section,
      context,
      this.items(
        context.content?.expertise ||
        context.content?.services
      )
    );
  }

  private renderGeneric(
    context: WebsiteSectionRenderContext,
    section: WebsiteSectionDefinition
  ): string {
    const c = context.content || {};

    const text =
      c[section.type]?.description ||
      c[section.type] ||
      '';

    if (!text || typeof text !== 'string') {
      return '';
    }

    return `
<section id="${this.slug(section.type)}" class="wf-section wf-generic wf-generic-${this.variant(section)}">
  <div class="wf-container">
    <div class="wf-section-heading">
      <h2>${this.esc(section.title || section.type)}</h2>
    </div>
    <p>${this.esc(text)}</p>
  </div>
</section>`;
  }

  private renderCardSection(
    type: string,
    section: WebsiteSectionDefinition,
    context: WebsiteSectionRenderContext,
    items: any[]
  ): string {
    if (!items.length) return '';

    const title =
      section.title ||
      this.defaultTitle(type);

    return `
<section id="${this.slug(type)}" class="wf-section wf-cards wf-${this.slug(type)} wf-${this.slug(type)}-${this.variant(section)}">
  <div class="wf-container">
    <div class="wf-section-heading">
      <span class="wf-kicker">${this.esc(type)}</span>
      <h2>${this.esc(title)}</h2>
    </div>

    <div class="wf-card-grid">
      ${items.map((item: any) => {
        const titleText =
          typeof item === 'string'
            ? item
            : item.title || item.name || '';

        const description =
          typeof item === 'string'
            ? ''
            : item.description || item.content || item.answer || '';

        const image =
          typeof item === 'string'
            ? ''
            : item.image || item.url || '';

        const price =
          typeof item === 'string'
            ? ''
            : item.price || '';

        return `
<article class="wf-card">
  ${
    image
      ? `<div class="wf-card-media"><img src="${this.esc(image)}" alt="${this.esc(titleText)}" loading="lazy"></div>`
      : ''
  }
  <div class="wf-card-body">
    <h3>${this.esc(titleText)}</h3>
    ${description ? `<p>${this.esc(description)}</p>` : ''}
    ${price ? `<strong class="wf-card-price">${this.esc(String(price))}</strong>` : ''}
  </div>
</article>`;
      }).join('')}
    </div>
  </div>
</section>`;
  }

  private items(value: any): any[] {
    if (!Array.isArray(value)) return [];
    return value.filter(Boolean);
  }

  private variant(section: WebsiteSectionDefinition): string {
    return this.slug(section.variant || 'default');
  }

  private defaultTitle(type: string): string {
    const titles: Record<string, string> = {
      services: 'Serviços',
      products: 'Produtos',
      features: 'Destaques',
      benefits: 'Por que escolher',
      team: 'Nossa equipe',
      process: 'Como funciona',
      portfolio: 'Projetos',
      testimonials: 'O que nossos clientes dizem',
      'social-proof': 'Resultados e confiança',
      stats: 'Números',
      menu: 'Cardápio',
      pricing: 'Planos e preços',
      cases: 'Cases',
      highlights: 'Destaques',
      expertise: 'Especialidades'
    };

    return titles[type] || type;
  }

  private slug(value: string): string {
    return String(value || 'section')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 60) || 'section';
  }

  private esc(value: any): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

export const websiteSectionRenderer =
  new WebsiteSectionRenderer();


// RB FACTORY - normalizacao de tipos de secao
function normalizeSectionType(type: string): string {
  if (!type) return 'generic';
  const map: Record<string, string> = { 'social-proof': 'socialProof', 'social_proof': 'socialProof', 'newsletter': 'newsletter', 'call-to-action': 'cta' };
  return map[type.toLowerCase().trim()] || type;
}
