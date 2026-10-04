import { GoogleGenAI } from '@google/genai';

// Instanciaã£Â£ã†â€™ã£â€šã‚Â§ã£Â£ã†â€™ã£â€šã‚Â£o segura da SDK do Gemini
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export type CommercialIntent = 
  | 'GREETING'
  | 'PRICE'
  | 'QUOTE'
  | 'NEGOTIATION'
  | 'PAYMENT'
  | 'ORDER'
  | 'CATALOG'
  | 'HUMAN'
  | 'UNKNOWN';

export interface IntentAnalysisResult {
  intent: CommercialIntent;
  confidence: number;
  extractedProduct?: string;
  extractedQuantity?: number;
  reasoning?: string;
}

export interface BusinessContext {
  products?: Array<{ name: string; salePrice: number; stock: number; description?: string | null }>;
  currentQuote?: { id: string; totalValue: number; discount: number; status: string } | null;
  leadName?: string | null;
  systemRules?: { maxDiscountPercent: number; companyName: string };
}

export interface ProcessMessageParams {
  phone?: string;
  name?: string;
  message: string;
  context?: BusinessContext;
}

export class AIService {
  /**
   * Classifica a intenã£Â£ã†â€™ã£â€šã‚Â§ã£Â£ã†â€™ã£â€šã‚Â£o da mensagem do cliente com base nas categorias comerciais suportadas.
   */
  async classifyIntent(messageContent: string): Promise<IntentAnalysisResult> {
    if (!ai || !apiKey) {
      console.warn('[AIService] GEMINI_API_KEY ausente. Usando fallback de intenã£Â£ã†â€™ã£â€šã‚Â§ã£Â£ã†â€™ã£â€šã‚Â£o.');
      return this.fallbackIntentClassification(messageContent);
    }

    try {
      const prompt = `
Vocã£Â£ã†â€™ã£â€šã‚Âª ã£Â£ã†â€™ã£â€šã‚Â© um classificador de intenã£Â£ã†â€™ã£â€šã‚Â§ã£Â£ã†â€™ã£â€šã‚Âµes comerciais de alta precisã£Â£ã†â€™ã£â€šã‚Â£o.
Analise a mensagem do cliente e classifique-a estritamente em UMA das seguintes intenã£Â£ã†â€™ã£â€šã‚Â§ã£Â£ã†â€™ã£â€šã‚Âµes:
- GREETING: Saudaã£Â£ã†â€™ã£â€šã‚Â§ã£Â£ã†â€™ã£â€šã‚Â£o, bom dia, olã£Â£ã†â€™ã£â€šã‚Â¡.
- PRICE: Pergunta sobre valor/preã£Â£ã†â€™ã£â€šã‚Â§o de um produto especã£Â£ã†â€™ã£â€šã‚Â­fico.
- QUOTE: Solicitaã£Â£ã†â€™ã£â€šã‚Â§ã£Â£ã†â€™ã£â€šã‚Â£o de orã£Â£ã†â€™ã£â€šã‚Â§amento ou pedido de cotaã£Â£ã†â€™ã£â€šã‚Â§ã£Â£ã†â€™ã£â€šã‚Â£o com quantidade.
- NEGOTIATION: Pedido de desconto, contraproposta ou negociaã£Â£ã†â€™ã£â€šã‚Â§ã£Â£ã†â€™ã£â€šã‚Â£o de preã£Â£ã†â€™ã£â€šã‚Â§o.
- PAYMENT: Dã£Â£ã†â€™ã£â€šã‚Âºvida sobre formas de pagamento, envio de comprovante ou status financeiro.
- ORDER: Acompanhamento de pedido, envio de endereã£Â£ã†â€™ã£â€šã‚Â§o ou confirmaã£Â£ã†â€™ã£â€šã‚Â§ã£Â£ã†â€™ã£â€šã‚Â£o de compra.
- CATALOG: Pedido para ver catã£Â£ã†â€™ã£â€šã‚Â¡logo, lista de produtos disponã£Â£ã†â€™ã£â€šã‚Â­veis.
- HUMAN: Solicitaã£Â£ã†â€™ã£â€šã‚Â§ã£Â£ã†â€™ã£â€šã‚Â£o de atendimento humano, falar com atendente ou reclamaã£Â£ã†â€™ã£â€šã‚Â§ã£Â£ã†â€™ã£â€šã‚Â£o grave.
- UNKNOWN: Mensagem fora do contexto comercial ou incompreensã£Â£ã†â€™ã£â€šã‚Â­vel.

Mensagem do cliente: "${messageContent}"

Responda EXCLUSIVAMENTE em formato JSON estrito:
{
  "intent": "QUALQUER_UMA_DAS_ACIMA",
  "confidence": 0.95,
  "extractedProduct": "nome do produto se citado ou null",
  "extractedQuantity": 1
}
`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });

      const text = response.text || '';
      const parsed = JSON.parse(text);

      const validIntents: CommercialIntent[] = [
        'GREETING', 'PRICE', 'QUOTE', 'NEGOTIATION', 'PAYMENT', 'ORDER', 'CATALOG', 'HUMAN', 'UNKNOWN'
      ];

      const intent: CommercialIntent = validIntents.includes(parsed.intent) ? parsed.intent : 'UNKNOWN';

      return {
        intent,
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.8,
        extractedProduct: parsed.extractedProduct || undefined,
        extractedQuantity: typeof parsed.extractedQuantity === 'number' ? parsed.extractedQuantity : undefined,
      };
    } catch (error) {
      console.error('[AIService Error - classifyIntent]:', error);
      return this.fallbackIntentClassification(messageContent);
    }
  }

  /**
   * Gera a resposta comercial utilizando os dados OFICIAIS do banco de dados como contexto imutã£Â£ã†â€™ã£â€šã‚Â¡vel.
   * GUARDRAIL: A IA ã£Â£ã†â€™ã£â€šã‚Â© proibida de inventar preã£Â£ã†â€™ã£â€šã‚Â§os, estoques ou orã£Â£ã†â€™ã£â€šã‚Â§amentos.
   */
  async generateCommercialResponse(
    userMessage: string,
    intent: CommercialIntent,
    context: BusinessContext
  ): Promise<string> {
    if (!ai || !apiKey) {
      return this.generateFallbackResponse(intent, context);
    }

    try {
      const company = context.systemRules?.companyName || 'nossa empresa';
      const maxDiscount = context.systemRules?.maxDiscountPercent || 10;
      const productsJson = JSON.stringify(context.products || []);
      const quoteJson = JSON.stringify(context.currentQuote || 'Nenhum orã£Â£ã†â€™ã£â€šã‚Â§amento ativo');
      const lead = context.leadName || 'Cliente';

      const systemInstruction = `
Vocã£Â£ã†â€™ã£â€šã‚Âª ã£Â£ã†â€™ã£â€šã‚Â© o assistente virtual de vendas da ${company}.
Sua prioridade mã£Â£ã†â€™ã£â€šã‚Â¡xima ã£Â£ã†â€™ã£â€šã‚Â© ser atencioso, profissional e preciso.

REGRAS DE SEGURANã£Â£ã†â€™ã£Â¢ã¢â€šÂ¬ã‚Â¡A E GUARDRAILS COMERCIAIS INVIOLã£Â£ã†â€™ã£â€šã‚ÂVEIS:
1. NUNCA INVENTE PREã£Â£ã†â€™ã£Â¢ã¢â€šÂ¬ã‚Â¡OS, DESCONTOS OU ESTOQUES.
2. Utilize EXCLUSIVAMENTE os dados de produtos fornecidos no CONTEXTO OFICIAL abaixo.
3. Se o cliente perguntar por um produto que nã£Â£ã†â€™ã£â€šã‚Â£o estã£Â£ã†â€™ã£â€šã‚Â¡ no contexto, diga gentilmente que vai verificar a disponibilidade com a equipe.
4. Se o cliente pedir desconto alã£Â£ã†â€™ã£â€šã‚Â©m do permitido (Mã£Â£ã†â€™ã£â€šã‚Â¡ximo de ${maxDiscount}%), informe que precisa de aprovaã£Â£ã†â€™ã£â€šã‚Â§ã£Â£ã†â€™ã£â€šã‚Â£o gerencial.
5. Seja claro, conciso e direcione o cliente para o prã£Â£ã†â€™ã£â€šã‚Â³ximo passo do funil de vendas.

CONTEXTO OFICIAL DO BANCO DE DADOS:
- Produtos Disponã£Â£ã†â€™ã£â€šã‚Â­veis: ${productsJson}
- Orã£Â£ã†â€™ã£â€šã‚Â§amento Atual do Cliente: ${quoteJson}
- Nome do Cliente: ${lead}
`;

      const prompt = `Intenã£Â£ã†â€™ã£â€šã‚Â§ã£Â£ã†â€™ã£â€šã‚Â£o identificada: ${intent}\nMensagem do cliente: "${userMessage}"\nResponda ao cliente com base estritamente no contexto oficial fornecido.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.3,
        },
      });

      return response.text || this.generateFallbackResponse(intent, context);
    } catch (error) {
      console.error('[AIService Error - generateCommercialResponse]:', error);
      return this.generateFallbackResponse(intent, context);
    }
  }

  /**
   * Classificaã£Â£ã†â€™ã£â€šã‚Â§ã£Â£ã†â€™ã£â€šã‚Â£o simples baseada em palavras-chave para contingã£Â£ã†â€™ã£â€šã‚Âªncia.
   */
  private fallbackIntentClassification(message: string): IntentAnalysisResult {
    const text = message.toLowerCase();
    if (text.includes('olã£Â£ã†â€™ã£â€šã‚Â¡') || text.includes('bom dia') || text.includes('boa tarde') || text.includes('oi')) {
      return { intent: 'GREETING', confidence: 0.9 };
    }
    if (text.includes('quanto custa') || text.includes('preã£Â£ã†â€™ã£â€šã‚Â§o') || text.includes('valor')) {
      return { intent: 'PRICE', confidence: 0.8 };
    }
    if (text.includes('orã£Â£ã†â€™ã£â€šã‚Â§amento') || text.includes('cotaã£Â£ã†â€™ã£â€šã‚Â§ã£Â£ã†â€™ã£â€šã‚Â£o') || text.includes('unidades')) {
      return { intent: 'QUOTE', confidence: 0.8 };
    }
    if (text.includes('desconto') || text.includes('menor preã£Â£ã†â€™ã£â€šã‚Â§o') || text.includes('melhorar')) {
      return { intent: 'NEGOTIATION', confidence: 0.8 };
    }
    if (text.includes('pagamento') || text.includes('pix') || text.includes('cartã£Â£ã†â€™ã£â€šã‚Â£o') || text.includes('comprovante')) {
      return { intent: 'PAYMENT', confidence: 0.8 };
    }
    if (text.includes('atendente') || text.includes('humano') || text.includes('falar com pessoa')) {
      return { intent: 'HUMAN', confidence: 0.9 };
    }
    return { intent: 'UNKNOWN', confidence: 0.5 };
  }

  /**
   * Resposta de contingã£Â£ã†â€™ã£â€šã‚Âªncia segura garantindo que nenhuma informaã£Â£ã†â€™ã£â€šã‚Â§ã£Â£ã†â€™ã£â€šã‚Â£o falsa seja fornecida ao cliente.
   */
  private generateFallbackResponse(intent: CommercialIntent, context: BusinessContext): string {
    switch (intent) {
      case 'GREETING':
        return `Olã£Â£ã†â€™ã£â€šã‚Â¡ ${context.leadName || ''}! Como posso te ajudar hoje?`;
      case 'PRICE':
      case 'CATALOG':
        if (context.products && context.products.length > 0) {
          const list = context.products.map(p => `âã£Â¢ã¢â‚¬Å¡ã‚Â¬ã£â€šã‚Â¢ ${p.name}: R$ ${p.salePrice.toFixed(2)}`).join('\n');
          return `Aqui estã£Â£ã†â€™ã£â€šã‚Â£o nossos produtos disponã£Â£ã†â€™ã£â€šã‚Â­veis:\n${list}`;
        }
        return `Estou consultando nosso catã£Â£ã†â€™ã£â€šã‚Â¡logo de produtos e te dou retorno em um instante!`;
      case 'QUOTE':
        return `Para gerar seu orã£Â£ã†â€™ã£â€šã‚Â§amento com desconto especial por quantidade, qual item vocã£Â£ã†â€™ã£â€šã‚Âª prefere?`;
      case 'NEGOTIATION':
        return `Nossos preã£Â£ã†â€™ã£â€šã‚Â§os jã£Â£ã†â€™ã£â€šã‚Â¡ estã£Â£ã†â€™ã£â€šã‚Â£o em oferta especial, mas posso verificar com nossa gerã£Â£ã†â€™ã£â€šã‚Âªncia a melhor condiã£Â£ã†â€™ã£â€šã‚Â§ã£Â£ã†â€™ã£â€šã‚Â£o para seu pedido!`;
      case 'PAYMENT':
        return `Aceitamos Pix, cartã£Â£ã†â€™ã£â€šã‚Â£o de crã£Â£ã†â€™ã£â€šã‚Â©dito e boleto. Como prefere realizar o pagamento?`;
      case 'HUMAN':
        return `Entendido! Estou transferindo seu atendimento para um de nossos especialistas comerciais. Um momento, por favor.`;
      default:
        return `Obrigado pelo contato! Como posso ajudar vocã£Â£ã†â€™ã£â€šã‚Âª com nossos produtos hoje?`;
    }
  }
}

export const aiService = new AIService();

/**
 * Funã£Â£ã†â€™ã£â€šã‚Â§ã£Â£ã†â€™ã£â€šã‚Â£o orquestradora polimã£Â£ã†â€™ã£â€šã‚Â³rfica: aceita objeto { phone, name, message } ou string direta.
 */
export async function processCustomerMessage(
  input: string | ProcessMessageParams,
  explicitContext: BusinessContext = {}
): Promise<{ intent: IntentAnalysisResult; responseText: string }> {
  let message = '';
  let context: BusinessContext = { ...explicitContext };

  if (typeof input === 'string') {
    message = input;
  } else {
    message = input.message || '';
    if (input.name) {
      context.leadName = input.name;
    }
    if (input.context) {
      context = { ...context, ...input.context };
    }
  }

  const intentResult = await aiService.classifyIntent(message);
  const responseText = await aiService.generateCommercialResponse(
    message,
    intentResult.intent,
    context
  );

  return {
    intent: intentResult,
    responseText,
  };
}

export default aiService;