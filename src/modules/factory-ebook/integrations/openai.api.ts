import axios from 'axios';

export class OpenAIAPI {
  private apiKey = process.env.OPENAI_API_KEY || '';
  private baseURL = 'https://api.openai.com/v1';

  async gerarTexto(prompt: string, modelo: string = 'gpt-4o-mini') {
    if (!this.apiKey) throw new Error('OPENAI_API_KEY nao configurada');

    try {
      const response = await axios.post(
        this.baseURL + '/chat/completions',
        {
          model: modelo,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.8,
          max_tokens: 2048
        },
        { headers: { 'Authorization': 'Bearer ' + this.apiKey, 'Content-Type': 'application/json' } }
      );
      return response.data.choices[0].message.content;
    } catch (error: any) {
      console.error('[OpenAI] Erro:', error.response?.data || error.message);
      throw error;
    }
  }

  async gerarImagem(prompt: string, tamanho: string = '1024x1024') {
    if (!this.apiKey) throw new Error('OPENAI_API_KEY nao configurada');

    try {
      const response = await axios.post(
        this.baseURL + '/images/generations',
        {
          model: 'dall-e-3',
          prompt: prompt,
          n: 1,
          size: tamanho,
          quality: 'standard'
        },
        { headers: { 'Authorization': 'Bearer ' + this.apiKey, 'Content-Type': 'application/json' } }
      );
      return response.data.data[0].url;
    } catch (error: any) {
      console.error('[OpenAI Image] Erro:', error.response?.data || error.message);
      throw error;
    }
  }
}
