import OpenAI from 'openai';
import { AIProvider, AIRequest } from '../aiProvider';

export class OpenAIProvider implements AIProvider {
  readonly name = 'openai' as const;

  private client: OpenAI | null = null;

  private get apiKey(): string {
    return process.env.OPENAI_API_KEY || '';
  }

  private get model(): string {
    return process.env.OPENAI_WEBSITE_MODEL || 'gpt-4o-mini';
  }

  isAvailable(): boolean {
    return this.apiKey.length > 0;
  }

  private getClient(): OpenAI | null {
    if (!this.isAvailable()) {
      return null;
    }

    if (!this.client) {
      this.client = new OpenAI({
        apiKey: this.apiKey
      });
    }

    return this.client;
  }

  async generate(request: AIRequest): Promise<string | null> {
    const client = this.getClient();

    if (!client) {
      console.log('[AI:OpenAI] não configurado');
      return null;
    }

    try {
      const completion = await client.chat.completions.create({
        model: this.model,
        temperature: request.temperature ?? 0.7,
        messages: [
          {
            role: 'user',
            content: request.prompt
          }
        ]
      });

      const text = completion.choices?.[0]?.message?.content;

      if (!text) {
        console.warn('[AI:OpenAI] resposta vazia');
        return null;
      }

      console.log(`[AI:OpenAI] sucesso: ${this.model}`);

      return text;
    } catch (error: any) {
      console.error(
        '[AI:OpenAI] erro:',
        error?.message || error
      );

      return null;
    }
  }
}
