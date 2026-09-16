import axios from 'axios';

export interface CreativeRequest {
  productName: string;
  segment: string;
  targetAudience: string;
  tone?: 'professional' | 'casual' | 'urgent' | 'friendly';
}

export interface CreativeOutput {
  whatsappScript: string;
  emailSubject: string;
  emailBody: string;
  socialPost: string;
  cta: string;
}

export class CreativeGeneratorService {
  private apiKey: string;
  private model: string;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || '';
    this.model = 'gemini-3.6-flash';
  }

  async generateCreative(request: CreativeRequest): Promise<CreativeOutput> {
    if (!this.apiKey) {
      return this.getFallbackCreative(request);
    }

    
    // Definir estilo baseado no segmento
    let styleHint = "Profissional e direto";
    const segLower = request.segment.toLowerCase();
    if (segLower.includes('perfume') || segLower.includes('luxo') || segLower.includes('joia')) {
      styleHint = "Sofisticado, exclusivo, luxuoso e elegante";
    } else if (segLower.includes('brinde') || segLower.includes('corporativo')) {
      styleHint = "Profissional, prÃ¡tico, focado em custo-benefÃ­cio e parceria";
    } else if (segLower.includes('tecnologia') || segLower.includes('eletrÃ´nico')) {
      styleHint = "Inovador, moderno, focado em specs e performance";
    }

    const prompt = `VocÃª Ã© um especialista em marketing digital e copywriting de alta conversÃ£o.
    
Crie materiais de venda para o seguinte produto:
- Produto: ${request.productName}
- Segmento: ${request.segment}
- PÃºblico-alvo: ${request.targetAudience}
- Tom de voz obrigatÃ³rio: ${styleHint} (Adapte a linguagem para este estilo)

Retorne APENAS um JSON vÃ¡lido com esta estrutura exata (sem markdown, sem explicaÃ§Ãµes):
{
  "whatsappScript": "Texto curto e persuasivo para WhatsApp (max 500 caracteres) com emoji e CTA claro",
  "emailSubject": "Assunto de email curto e chamativo (max 60 caracteres)",
  "emailBody": "Corpo do email profissional com problema, soluÃ§Ã£o e CTA (max 800 caracteres)",
  "socialPost": "Post para Instagram/Facebook com hashtags (max 300 caracteres)",
  "cta": "Frase curta de chamada para aÃ§Ã£o (max 50 caracteres)"
}`;

    try {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 1024
          }
        },
        { timeout: 30000 }
      );

      const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      // Extrair JSON da resposta
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      throw new Error('Resposta da IA nao contem JSON valido');
    } catch (error: any) {
      console.error('Erro ao gerar criativo com IA:', error.message);
      return this.getFallbackCreative(request);
    }
  }

  // Fallback caso a IA falhe
  private getFallbackCreative(request: CreativeRequest): CreativeOutput {
    return {
      whatsappScript: `Ola! Temos uma oferta especial de ${request.productName} para empresas do segmento de ${request.segment}. Quer saber mais?`,
      emailSubject: `Oferta especial de ${request.productName}`,
      emailBody: `Prezado(a),\n\nTemos ${request.productName} com condicoes especiais para o segmento de ${request.segment}.\n\nEntre em contato para mais informacoes.\n\nAtenciosamente,\nEquipe SALE-IA-V2`,
      socialPost: `${request.productName} - Qualidade e preco justo para seu negocio! #brindes #personalizados`,
      cta: `Solicite seu orcamento agora!`
    };
  }

  // Gerar criativo em lote para campanha
  async generateBatchCreatives(products: Array<{name: string, segment: string}>, targetAudience: string) {
    const results = [];
    for (const product of products) {
      const creative = await this.generateCreative({
        productName: product.name,
        segment: product.segment,
        targetAudience
      });
      results.push({ product: product.name, ...creative });
    }
    return results;
  }
}

export const creativeGeneratorService = new CreativeGeneratorService();