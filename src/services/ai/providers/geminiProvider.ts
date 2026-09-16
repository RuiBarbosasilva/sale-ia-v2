import axios from 'axios';
import { AIProvider, AIRequest } from '../aiProvider';

export class GeminiProvider implements AIProvider {
  readonly name = 'gemini' as const;

  private readonly DEFAULT_MODELS = [
    'gemini-flash-latest',
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-2.5-flash-lite',
    'gemini-flash-lite-latest',
    'gemini-1.5-flash'
  ];

  private get apiKey(): string {
    return process.env.GEMINI_API_KEY || '';
  }

  isAvailable(): boolean {
    return this.apiKey.length > 0;
  }

  private get candidateModels(): string[] {
    const primary = process.env.GEMINI_WEBSITE_MODEL || '';

    const list = primary
      ? [primary, ...this.DEFAULT_MODELS]
      : [...this.DEFAULT_MODELS];

    return [...new Set(list)];
  }

  async generate(request: AIRequest): Promise<string | null> {
    if (!this.isAvailable()) {
      console.log('[AI:Gemini] API key ausente');
      return null;
    }

    const models = this.candidateModels;

    for (let i = 0; i < models.length; i++) {
      const model = models[i];

      try {
        const url =
          `https://generativelanguage.googleapis.com/v1beta/models/` +
          `${model}:generateContent?key=${this.apiKey}`;

        const generationConfig: any = {
          temperature: request.temperature ?? 0.7
        };

        if (request.jsonMode) {
          generationConfig.responseMimeType = 'application/json';
        }

        const response = await axios.post(
          url,
          {
            contents: [
              {
                parts: [
                  {
                    text: request.prompt
                  }
                ]
              }
            ],
            generationConfig
          },
          {
            timeout: 60000
          }
        );

        const text =
          response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (text) {
          console.log(`[AI:Gemini] sucesso: ${model}`);
          return text;
        }
      } catch (error: any) {
        const status =
          error?.response?.status || 'sem-status';

        const message =
          error?.response?.data?.error?.message ||
          error?.message ||
          'erro desconhecido';

        console.warn(
          `[AI:Gemini] ${model} falhou (${status}): ` +
          `${String(message).substring(0, 120)}`
        );

        if (status === 429) {
          await new Promise(resolve => setTimeout(resolve, 1500));
        } else if (status === 503) {
          await new Promise(resolve => setTimeout(resolve, 800));
        }
      }
    }

    console.error('[AI:Gemini] todos os modelos falharam');

    return null;
  }
}
