import { aiProviderManager } from '../ai';
import { AIProviderName } from '../ai/aiProvider';

export interface WebsiteAIContent {
  heroHeadline?: string;
  heroSubtitle?: string;
  aboutText?: string;
  ctaText?: string;
  slogan?: string;
  metaTitle?: string;
  metaDescription?: string;

  services?: Array<{
    title: string;
    description: string;
  }>;

  benefits?: Array<{
    title: string;
    description: string;
  }>;

  faq?: Array<{
    question: string;
    answer: string;
  }>;
}

export class WebsiteAIEnhancerService {

  get isAvailable(): boolean {
    return aiProviderManager
      .getAvailableProviders()
      .some(provider => provider.available);
  }

  getProviderInfo() {
    return aiProviderManager.getAvailableProviders();
  }

  getModelInfo() {
    return {
      available: this.isAvailable,
      providers: this.getProviderInfo(),
      order:
        process.env.WEBSITE_AI_PROVIDER_ORDER ||
        'gemini,qwen,openai'
    };
  }

  async enhance(
    briefing: any,
    base: any,
    variation = 0,
    preferredProvider?: AIProviderName
  ): Promise<WebsiteAIContent | null> {

    if (!this.isAvailable) {
      console.log(
        '[WebsiteAI] nenhum provedor configurado, usando fallback'
      );
      return null;
    }

    const prompt = this.buildPrompt(
      briefing,
      base,
      variation
    );

    const text = await aiProviderManager.generate(
      {
        prompt,
        temperature: Math.min(
          0.95,
          0.7 + variation * 0.1
        ),
        jsonMode: false,
        context: 'website-enhance'
      },
      preferredProvider
    );

    if (!text) {
      return null;
    }

    const parsed = this.parseJson(text);

    if (!parsed) {
      console.error(
        '[WebsiteAI] resposta não era JSON válido'
      );
      return null;
    }

    return this.normalize(parsed);
  }

  async generateJSON(
    prompt: string,
    context: string,
    preferredProvider?: AIProviderName
  ): Promise<any | null> {

    if (!this.isAvailable) {
      console.log(
        `[WebsiteAI:${context}] nenhum provedor configurado`
      );
      return null;
    }

    const text = await aiProviderManager.generate(
      {
        prompt,
        temperature: 0.7,
        jsonMode: true,
        context
      },
      preferredProvider
    );

    if (!text) {
      console.error(
        `[WebsiteAI:${context}] todos os provedores falharam`
      );
      return null;
    }

    const parsed = this.parseJson(text);

    if (!parsed) {
      console.error(
        `[WebsiteAI:${context}] resposta não era JSON válido`
      );
      return null;
    }

    return parsed;
  }

  private buildPrompt(
    b: any,
    base: any,
    v: number
  ): string {

    return `Você é um copywriter especialista em sites comerciais brasileiros.

Gere o conteúdo de um site institucional/landing page em pt-BR.

Responda SOMENTE com JSON válido, sem markdown e sem texto extra.

${v > 0
  ? `Iteração ${v}: crie uma versão DIFERENTE e criativa, não repita a anterior.`
  : ''
}

DADOS DO NEGÓCIO:

- Nome: ${b.businessName || base.businessName || ''}
- Segmento: ${b.category || ''}
- Cidade: ${b.city || ''}
- Descrição: ${b.description || ''}
- Serviços: ${
      Array.isArray(b.services)
        ? b.services.join(', ')
        : ''
    }
- Diferenciais: ${
      Array.isArray(b.differentials)
        ? b.differentials.join(', ')
        : ''
    }
- Público-alvo: ${b.targetAudience || ''}
- Tom: ${b.tone || 'profissional'}

FORMATO JSON:

{
  "heroHeadline":"...",
  "heroSubtitle":"...",
  "slogan":"...",
  "aboutText":"...",
  "ctaText":"...",
  "services":[
    {
      "title":"...",
      "description":"..."
    }
  ],
  "benefits":[
    {
      "title":"...",
      "description":"..."
    }
  ],
  "faq":[
    {
      "question":"...",
      "answer":"..."
    }
  ],
  "metaTitle":"...",
  "metaDescription":"..."
}

REGRAS:

- 3-6 services
- 3 benefits
- 3 faq
- Headline impactante com no máximo 8 palavras
- Máximo de 500 palavras
- Português brasileiro natural
- Não invente informações específicas que não estejam no briefing
`;
  }

  private parseJson(text: string): any | null {

    try {

      const clean = text
        .trim()
        .replace(/^```json/i, '')
        .replace(/^```/i, '')
        .replace(/```$/i, '')
        .trim();

      const start = clean.indexOf('{');
      const end = clean.lastIndexOf('}');

      if (
        start < 0 ||
        end <= start
      ) {
        return null;
      }

      return JSON.parse(
        clean.substring(
          start,
          end + 1
        )
      );

    } catch {
      return null;
    }
  }

  private normalize(
    parsed: any
  ): WebsiteAIContent | null {

    if (
      !parsed ||
      typeof parsed !== 'object'
    ) {
      return null;
    }

    const output: WebsiteAIContent = {};

    const stringValue = (
      value: any
    ): string | undefined => {

      return typeof value === 'string' &&
        value.trim().length > 0
        ? value.trim()
        : undefined;
    };

    output.heroHeadline =
      stringValue(parsed.heroHeadline);

    output.heroSubtitle =
      stringValue(parsed.heroSubtitle);

    output.aboutText =
      stringValue(parsed.aboutText);

    output.ctaText =
      stringValue(parsed.ctaText);

    output.slogan =
      stringValue(parsed.slogan);

    output.metaTitle =
      stringValue(parsed.metaTitle);

    output.metaDescription =
      stringValue(parsed.metaDescription);

    const normalizeArray = (
      value: any,
      mapper: (item: any) => any,
      maximum: number
    ) => {

      return Array.isArray(value)
        ? value
            .slice(0, maximum)
            .map(mapper)
            .filter(Boolean)
        : undefined;
    };

    output.services = normalizeArray(
      parsed.services,
      item => {

        const title =
          stringValue(item?.title);

        const description =
          stringValue(item?.description);

        return title && description
          ? {
              title,
              description
            }
          : null;
      },
      6
    );

    output.benefits = normalizeArray(
      parsed.benefits,
      item => {

        const title =
          stringValue(item?.title);

        const description =
          stringValue(item?.description);

        return title && description
          ? {
              title,
              description
            }
          : null;
      },
      3
    );

    output.faq = normalizeArray(
      parsed.faq,
      item => {

        const question =
          stringValue(item?.question);

        const answer =
          stringValue(item?.answer);

        return question && answer
          ? {
              question,
              answer
            }
          : null;
      },
      4
    );

    const hasContent =
      Object.values(output).some(
        value =>
          value !== undefined &&
          (
            !Array.isArray(value) ||
            value.length > 0
          )
      );

    return hasContent
      ? output
      : null;
  }
}

export const websiteAIEnhancerService =
  new WebsiteAIEnhancerService();
