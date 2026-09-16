import { AIProvider, AIProviderName, AIRequest } from './aiProvider';
import { GeminiProvider } from './providers/geminiProvider';
import { QwenProvider } from './providers/qwenProvider';
import { OpenAIProvider } from './providers/openaiProvider';

export class AIProviderManager {
  private readonly providers: AIProvider[] = [
    new GeminiProvider(),
    new QwenProvider(),
    new OpenAIProvider()
  ];

  private get configuredOrder(): AIProviderName[] {
    const configured =
      process.env.WEBSITE_AI_PROVIDER_ORDER ||
      'gemini,qwen,openai';

    return configured
      .split(',')
      .map(v => v.trim() as AIProviderName)
      .filter(Boolean);
  }

  getAvailableProviders() {
    return this.providers.map(provider => ({
      name: provider.name,
      available: provider.isAvailable()
    }));
  }

  async generate(
    request: AIRequest,
    preferredProvider?: AIProviderName
  ): Promise<string | null> {

    const orderedNames = preferredProvider
      ? [
          preferredProvider,
          ...this.configuredOrder.filter(
            name => name !== preferredProvider
          )
        ]
      : this.configuredOrder;

    for (const name of orderedNames) {
      const provider = this.providers.find(
        item => item.name === name
      );

      if (!provider) {
        continue;
      }

      if (!provider.isAvailable()) {
        continue;
      }

      console.log(`[AI:Manager] tentando ${provider.name}`);

      const result = await provider.generate(request);

      if (result) {
        console.log(
          `[AI:Manager] resposta obtida via ${provider.name}`
        );

        return result;
      }

      console.warn(
        `[AI:Manager] ${provider.name} falhou, tentando próximo`
      );
    }

    console.error(
      '[AI:Manager] nenhum provedor conseguiu gerar resposta'
    );

    return null;
  }
}

export const aiProviderManager = new AIProviderManager();
