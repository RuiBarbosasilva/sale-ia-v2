import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

export class GeminiImageService {
  private apiKey = process.env.GEMINI_API_KEY || '';
  private baseURL = 'https://generativelanguage.googleapis.com/v1';

  async gerarImagemUnica(prompt: string, fileName: string) {
    if (!this.apiKey) return { sucesso: false, erro: 'GEMINI_API_KEY nao configurada no .env' };

    try {
      // Adiciona sufixo para garantir estilo livro de colorir
      const promptOtimizado = prompt + ', black and white line art, coloring book page style, white background, no shading, high quality, vector style';
      
      // Modelo oficial de geração de imagens Gemini
      const response = await axios.post(
        this.baseURL + '/models/gemini-2.5-flash-image:generateContent',
        {
          contents: [{ parts: [{ text: promptOtimizado }] }],
          generationConfig: { responseModalities: ['IMAGE'] }
        },
        { headers: { 'x-goog-api-key': this.apiKey, 'Content-Type': 'application/json' } }
      );
      
      const parts = response.data.candidates[0].content.parts;
      const imagem = parts.find((p: any) => p.inlineData);
      
      if (imagem) {
        const baseDir = path.resolve(process.cwd(), 'output', 'factory-ebook', 'imagens');
        if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });
        
        const filePath = path.join(baseDir, fileName + '.png');
        fs.writeFileSync(filePath, Buffer.from(imagem.inlineData.data, 'base64'));
        
        return { sucesso: true, filePath, mensagem: 'Imagem gerada com sucesso!' };
      }
      
      // Fallback se a API retornar apenas texto (comum em chaves free sem imagem ativada)
      return { 
        sucesso: false, 
        erro: 'A API retornou texto, mas nao imagem. Sua chave pode nao ter permissao para geracao de imagens ainda. Use o prompt abaixo em um gerador de imagens compatível: ' + promptOtimizado 
      };
    } catch (error: any) {
      console.error('[GeminiImage] Erro:', error.response?.data || error.message);
      return { sucesso: false, erro: error.response?.data?.error?.message || error.message };
    }
  }
}
