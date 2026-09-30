import axios from 'axios';

export class GeminiAPI {
  private apiKey = process.env.GEMINI_API_KEY || '';
  private baseURL = 'https://generativelanguage.googleapis.com/v1beta';

  async gerarTexto(prompt: string, modelo: string = 'gemini-2.0-flash') {
    if (!this.apiKey) throw new Error('GEMINI_API_KEY nao configurada');

    try {
      const response = await axios.post(
        this.baseURL + '/models/' + modelo + ':generateContent?key=' + this.apiKey,
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.8, maxOutputTokens: 2048 }
        }
      );
      return response.data.candidates[0].content.parts[0].text;
    } catch (error: any) {
      console.error('[Gemini] Erro:', error.response?.data || error.message);
      throw error;
    }
  }

  async gerarImagem(prompt: string) {
    if (!this.apiKey) throw new Error('GEMINI_API_KEY nao configurada');

    try {
      const response = await axios.post(
        this.baseURL + '/models/gemini-2.0-flash-exp:generateContent?key=' + this.apiKey,
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ['IMAGE', 'TEXT'] }
        }
      );
      
      const parts = response.data.candidates[0].content.parts;
      const imagem = parts.find((p: any) => p.inlineData);
      
      if (imagem) {
        return {
          base64: imagem.inlineData.data,
          mimeType: imagem.inlineData.mimeType,
          url: 'data:' + imagem.inlineData.mimeType + ';base64,' + imagem.inlineData.data
        };
      }
      throw new Error('Imagem nao gerada');
    } catch (error: any) {
      console.error('[Gemini Image] Erro:', error.response?.data || error.message);
      throw error;
    }
  }
}
