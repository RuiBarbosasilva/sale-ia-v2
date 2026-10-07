import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

export class GeminiImageService {
  private apiKey = process.env.GEMINI_API_KEY || '';
  private baseURL = 'https://generativelanguage.googleapis.com/v1';

  async gerarImagemUnica(prompt: string, fileName: string) {
    const cleanPrompt = String(prompt || '').trim();
    const cleanFileName = String(fileName || '').trim().replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 180);
    if (!cleanPrompt || cleanPrompt.length > 2000) return { sucesso: false, erro: 'Prompt invalido' };
    if (!cleanFileName) return { sucesso: false, erro: 'Nome de arquivo invalido' };
    if (!this.apiKey) return { sucesso: false, erro: 'GEMINI_API_KEY não configurada no .env' };

    try {
      // Adiciona sufixo para garantir estilo livro de colorir
      const promptOtimizado = cleanPrompt + ', black and white line art, coloring book page style, white background, no shading, high quality, vector style';
      
      // Modelo oficial de geração de imagens Gemini
      const response = await axios.post(
        this.baseURL + '/models/gemini-2.5-flash-image:generateContent',
        {
          contents: [{ parts: [{ text: promptOtimizado }] }],
          generationConfig: { responseModalities: ['IMAGE'] }
        },
        { headers: { 'x-goog-api-key': this.apiKey, 'Content-Type': 'application/json' } }
      );
      
      const candidates = Array.isArray(response.data?.candidates) ? response.data.candidates : [];
      const parts = candidates[0]?.content?.parts;
      if (!Array.isArray(parts)) {
        return { sucesso: false, erro: 'A API não retornou partes de conteúdo válidas.' };
      }
      const imagem = parts.find((p: unknown) => Boolean((p as { inlineData?: unknown })?.inlineData));
      
      if (imagem) {
        const baseDir = path.resolve(process.cwd(), 'output', 'factory-ebook', 'imagens');
        if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });
        
        const filePath = path.join(baseDir, cleanFileName + '.png');
        fs.writeFileSync(filePath, Buffer.from(imagem.inlineData.data, 'base64'));
        
        return { sucesso: true, filePath, mensagem: 'Imagem gerada com sucesso!' };
      }
      
      // Fallback se a API retornar apenas texto (comum em chaves free sem imagem ativada)
      return { 
        sucesso: false, 
        erro: 'A API retornou texto, mas não imagem. Sua chave pode nao ter permissao para geração de imagens ainda. Use o prompt abaixo em um gerador de imagens compatível: ' + promptOtimizado 
      };
    } catch (error: unknown) {
      const message = axios.isAxiosError(error)
        ? String(error.response?.data?.error?.message || error.message)
        : error instanceof Error ? error.message : 'Erro desconhecido ao gerar imagem';
      console.error('[GeminiImage] Erro:', message);
      return { sucesso: false, erro: message };
    }
  }
}
