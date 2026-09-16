export type AIProviderName =
  | 'gemini'
  | 'qwen'
  | 'openai';

export interface AIRequest {
  prompt: string;
  temperature?: number;
  jsonMode?: boolean;
  context?: string;
}

export interface AIProvider {
  readonly name: AIProviderName;
  isAvailable(): boolean;
  generate(request: AIRequest): Promise<string | null>;
}
