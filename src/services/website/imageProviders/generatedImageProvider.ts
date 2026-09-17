export interface GeneratedImageProviderCandidate {
  url: string;
  width: number;
  height: number;
  provider: string;
  model?: string;
  prompt?: string;
  mime?: string;
  alt?: string;
}

export interface GeneratedImageProvider {
  readonly name: string;
  readonly model: string;
  isAvailable(): boolean;
  generate(prompt: string, options?: {
    width?: number;
    height?: number;
    quality?: string;
    format?: 'png' | 'jpeg' | 'webp';
  }): Promise<GeneratedImageProviderCandidate | null>;
}
