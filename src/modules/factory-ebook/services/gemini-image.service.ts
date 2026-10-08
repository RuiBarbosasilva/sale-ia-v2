import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

export class GeminiImageService {
  private apiKey = process.env.GEMINI_API_KEY || '';
  private baseURL = 'https://generativelanguage.googleapis.com/v1';

  async gerarImagemUnica(prompt: string, fileName: string) {
    const cleanPrompt = typeof prompt === 'string' ? prompt.trim().slice(0, 2000) : '';
    const cleanFileName = typeof fileName === 'string'
      ? fileName.trim().replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 180)
      : '';

    if (!cleanPrompt) return { sucesso: false, erro: 'Prompt invalido' };
    if (!cleanFileName) return { sucesso: false, erro: 'Nome de arquivo invalido' };
    if (!this.apiKey) return { sucesso: false, erro: 'GEMINI_API_KEY não configurada no .env' };

    try {
      const promptOtimizado = cleanPrompt + ', black and white line art, coloring book page style, white background, no shading, high quality, vector style';
      const response = await axios.post(
        this.baseURL + '/models/gemini-2.5-flash-image:generateContent',
        {
          contents: [{ parts: [{ text: promptOtimizado }] }],
          generationConfig: { responseModalities: ['IMAGE'] }
        },
        {
          headers: { 'x-goog-api-key': this.apiKey, 'Content-Type': 'application/json' },
          timeout: 60000,
          maxContentLength: 25 * 1024 * 1024,
          maxBodyLength: 25 * 1024 * 1024
        }
      );

      const candidates = Array.isArray(response.data?.candidates) ? response.data.candidates : [];
      const parts = candidates[0]?.content?.parts;
      if (!Array.isArray(parts)) return { sucesso: false, erro: 'FACTORY_EBOOK_IMAGE_RESPONSE_INVALID' };

      const imagePart = parts.find((part: unknown) => {
        const inlineData = (part as { inlineData?: unknown })?.inlineData;
        return Boolean(inlineData && typeof inlineData === 'object');
      }) as { inlineData?: { data?: unknown; mimeType?: unknown } } | undefined;

      const base64 = imagePart?.inlineData?.data;
      if (typeof base64 === 'string' && base64.length > 0) {
        const baseDir = path.resolve(process.cwd(), 'output', 'factory-ebook', 'imagens');
        fs.mkdirSync(baseDir, { recursive: true });

        const safeFileName = cleanFileName.replace(/\.\.+/g, '.');
        const filePath = path.join(baseDir, safeFileName + '.png');
        const resolved = path.resolve(filePath);
        if (!resolved.startsWith(path.resolve(baseDir) + path.sep)) {
          return { sucesso: false, erro: 'FACTORY_EBOOK_IMAGE_PATH_INVALID' };
        }

        const buffer = Buffer.from(base64, 'base64');
        if (!buffer.length || buffer.length > 15 * 1024 * 1024) {
          return { sucesso: false, erro: 'FACTORY_EBOOK_IMAGE_SIZE_INVALID' };
        }

        fs.writeFileSync(resolved, buffer);
        return { sucesso: true, filePath: resolved, mensagem: 'Imagem gerada com sucesso!' };
      }

      return { sucesso: false, erro: 'FACTORY_EBOOK_IMAGE_NOT_RETURNED' };
    } catch (error: unknown) {
      const message = axios.isAxiosError(error)
        ? String(error.response?.data?.error?.message || 'GEMINI_IMAGE_API_FAILED').slice(0, 500)
        : error instanceof Error ? error.message.slice(0, 500) : 'GEMINI_IMAGE_API_FAILED';
      console.error('[GeminiImage] Erro:', message);
      return { sucesso: false, erro: 'GEMINI_IMAGE_API_FAILED' };
    }
  }
}
