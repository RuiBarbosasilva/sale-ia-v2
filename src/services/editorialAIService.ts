import { GoogleGenAI } from '@google/genai';

export type EditorialAIResult = {
  provider: string;
  model: string;
  text: string;
};

const apiKey = process.env.GEMINI_API_KEY || '';
const model = process.env.EDITORIAL_AI_MODEL || process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

function extractJson(text: string): any {
  const cleaned = text.trim().replace(/^\`\`\`(?:json)?/i, '').replace(/\`\`\`$/i, '').trim();
  try { return JSON.parse(cleaned); } catch {}
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try { return JSON.parse(cleaned.slice(start, end + 1)); } catch {}
  }
  throw new Error('EDITORIAL_AI_INVALID_JSON');
}

export const editorialAIService = {
  configured() {
    return Boolean(ai && apiKey);
  },

  async generate(prompt: string, systemInstruction?: string): Promise<EditorialAIResult> {
    if (!ai) throw new Error('EDITORIAL_AI_NOT_CONFIGURED');
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.45,
      },
    });
    const text = response.text?.trim() || '';
    if (!text) throw new Error('EDITORIAL_AI_EMPTY_RESPONSE');
    return { provider: 'google-gemini', model, text };
  },

  async generateJson(prompt: string, systemInstruction?: string): Promise<{ data: any; meta: EditorialAIResult }> {
    if (!ai) throw new Error('EDITORIAL_AI_NOT_CONFIGURED');
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.35,
        responseMimeType: 'application/json',
      },
    });
    const text = response.text?.trim() || '';
    if (!text) throw new Error('EDITORIAL_AI_EMPTY_RESPONSE');
    return { data: extractJson(text), meta: { provider: 'google-gemini', model, text } };
  },

  async createEditorialPlan(input: {
    title: string;
    audience: string;
    language: string;
    market: string;
    research: string;
    productType: string;
  }) {
    return this.generateJson(
      `Crie o plano editorial de um produto comercial de alta qualidade.
TÍTULO: ${input.title}
PÚBLICO: ${input.audience}
IDIOMA: ${input.language}
MERCADO: ${input.market}
TIPO: ${input.productType}
PESQUISA DISPONÍVEL:
${input.research.slice(0, 12000)}

Retorne SOMENTE JSON neste formato:
{
  "title": "título final",
  "subtitle": "subtítulo específico",
  "audience": "público específico",
  "promise": "promessa editorial realista, sem garantias",
  "description": "descrição comercial de 120-180 palavras",
  "chapters": [
    {"position":1,"title":"...","goal":"...","keyPoints":["...","...","..."]}
  ],
  "metadata": {
    "keywords":["...","...","...","...","...","...","..."],
    "categories":["...","..."],
    "readingLevel":"...",
    "estimatedWordCount":0
  }
}
Use 7 a 10 capítulos. Não invente fontes ou estatísticas. Quando a pesquisa não trouxer evidência, formule conteúdo como orientação geral e sinalize a necessidade de revisão factual.`,
      'Você é um editor-chefe e estrategista editorial. Priorize utilidade, originalidade, clareza, coerência e segurança factual. Não copie obras existentes.'
    );
  },

  async createChapter(input: {
    title: string;
    subtitle?: string | null;
    chapterTitle: string;
    chapterGoal: string;
    keyPoints: string[];
    previousSummary: string;
    research: string;
    audience: string;
    language: string;
    targetWords: number;
  }) {
    const result = await this.generate(
      `Escreva um capítulo ORIGINAL e completo para um eBook profissional.
LIVRO: ${input.title}
SUBTÍTULO: ${input.subtitle || ''}
CAPÍTULO: ${input.chapterTitle}
OBJETIVO: ${input.chapterGoal}
PONTOS-CHAVE: ${input.keyPoints.join('; ')}
PÚBLICO: ${input.audience}
IDIOMA: ${input.language}
TAMANHO ALVO: aproximadamente ${input.targetWords} palavras
RESUMO DOS CAPÍTULOS ANTERIORES:
${input.previousSummary.slice(0, 5000)}
EVIDÊNCIAS DE PESQUISA:
${input.research.slice(0, 10000)}

Regras:
- Não copie nem parafraseie deliberadamente livros/artigos conhecidos.
- Não invente estatísticas, estudos, leis, números, citações ou fontes.
- Se um dado factual específico não estiver nas evidências, explique o conceito sem atribuir números ou fonte.
- Use exemplos práticos claramente apresentados como exemplos.
- Escreva em português brasileiro natural, sem texto de preenchimento.
- Estruture com subtítulos, listas quando úteis e conclusão prática.
- Não mencione que você é IA e não inclua notas internas do processo editorial.`,
      'Você é um escritor profissional, pesquisador cuidadoso e editor de não ficção. Produza texto original, útil e publicável, evitando alegações factuais sem suporte.'
    );
    return result;
  },

  async reviewManuscript(input: {
    title: string;
    manuscript: string;
    research: string;
    language: string;
  }) {
    return this.generateJson(
      `Faça uma revisão editorial e factual rigorosa do manuscrito abaixo.
TÍTULO: ${input.title}
IDIOMA: ${input.language}
PESQUISA DISPONÍVEL:
${input.research.slice(0, 10000)}
MANUSCRITO:
${input.manuscript.slice(0, 30000)}

Retorne SOMENTE JSON:
{
  "approved": true,
  "score": 0,
  "summary": "...",
  "issues": [
    {"severity":"LOW|MEDIUM|HIGH","type":"FACTUAL|STRUCTURE|STYLE|DUPLICATION|SAFETY|METADATA","text":"...","suggestion":"..."}
  ],
  "improvements": ["...","..."]
}
Não invente verificações. Se não houver evidência suficiente para confirmar um fato, marque como revisão necessária em vez de afirmar que está correto.`,
      'Você é o revisor final de uma editora. Seja conservador com fatos e direitos autorais. Não aprove alegações que não possam ser sustentadas pelo material fornecido.'
    );
  },
};

export default editorialAIService;
