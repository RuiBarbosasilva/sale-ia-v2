import OpenAI from 'openai';
import { AIProvider, AIRequest } from '../aiProvider';

export class QwenProvider implements AIProvider {
  readonly name = 'qwen' as const;

  private client: OpenAI | null = null;

  private get apiKey(): string {
    return process.env.QWEN_API_KEY || '';
  }

  private get baseURL(): string {
    return process.env.QWEN_BASE_URL || '';
  }

  private get model(): string {
    return process.env.QWEN_WEBSITE_MODEL || 'qwen-plus';
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey && this.baseURL);
  }

  private getClient(): OpenAI | null {
    if (!this.isAvailable()) {
      return null;
    }

    if (!this.client) {
      this.client = new OpenAI({
        apiKey: this.apiKey,
        baseURL: this.baseURL
      });
    }

    return this.client;
  }

  async generate(request: AIRequest): Promise<string | null> {
    const client = this.getClient();

    if (!client) {
      console.log('[AI:Qwen] não configurado');
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
        console.warn('[AI:Qwen] resposta vazia');
        return null;
      }

      console.log(`[AI:Qwen] sucesso: ${this.model}`);

      return text;
    } catch (error: any) {
      console.error(
        '[AI:Qwen] erro:',
        error?.message || error
      );

      return null;
    }
  }
}
