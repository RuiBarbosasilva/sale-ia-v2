import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import {
  GeneratedImageProvider,
  GeneratedImageProviderCandidate
} from './generatedImageProvider';

export class OpenAIImageProvider implements GeneratedImageProvider {
  readonly name = 'openai-image';

  readonly model =
    process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2';

  private client: OpenAI | null = null;

  private get apiKey(): string {
    return process.env.OPENAI_API_KEY || '';
  }

  isAvailable(): boolean {
    return (
      process.env.OPENAI_IMAGE_ENABLED === 'true' &&
      this.apiKey.length > 0
    );
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

  async generate(
    prompt: string,
    options?: {
      width?: number;
      height?: number;
      quality?: string;
      format?: 'png' | 'jpeg' | 'webp';
    }
  ): Promise<GeneratedImageProviderCandidate | null> {
    const client = this.getClient();

    if (!client) {
      console.log(
        '[Image:OpenAI] provider indisponível ou desativado'
      );
      return null;
    }

    const width = options?.width || 1536;
    const height = options?.height || 1024;
    const quality =
      options?.quality || 'high';
    const format =
      options?.format || 'webp';

    try {
      const response = await client.images.generate({
        model: this.model as any,
        prompt,
        n: 1,
        size: `${width}x${height}` as any,
        quality: quality as any,
        output_format: format,
        background: 'opaque'
      });

      const image = response.data?.[0];

      if (!image?.b64_json) {
        console.warn(
          '[Image:OpenAI] resposta sem b64_json'
        );
        return null;
      }

      const outputDir = path.resolve(
        process.env.OPENAI_IMAGE_OUTPUT_DIR ||
        'storage/generated-images'
      );

      fs.mkdirSync(outputDir, {
        recursive: true
      });

      const filename =
        `openai-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}.${format}`;

      const filePath =
        path.join(outputDir, filename);

      fs.writeFileSync(
        filePath,
        Buffer.from(image.b64_json, 'base64')
      );

      const publicBaseUrl =
        process.env.OPENAI_IMAGE_PUBLIC_BASE_URL ||
        '/generated-images';

      const publicUrl =
        `${publicBaseUrl.replace(/\/$/, '')}/${filename}`;

      console.log(
        `[Image:OpenAI] imagem gerada: ${filename} | modelo=${this.model}`
      );

      return {
        url: publicUrl,
        width,
        height,
        provider: this.name,
        model: this.model,
        prompt,
        mime: `image/${format}`,
        alt: prompt
      };
    } catch (error: any) {
      console.error(
        '[Image:OpenAI] erro:',
        error?.message || error
      );

      return null;
    }
  }
}

export const openAIImageProvider =
  new OpenAIImageProvider();
