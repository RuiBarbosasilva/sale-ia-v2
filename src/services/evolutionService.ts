import axios from 'axios';

export interface SendTextMessageParams {
  number: string;
  text: string;
}

export class EvolutionService {
  private baseUrl: string;
  private apiKey: string;
  private instanceName: string;

  constructor() {
    this.baseUrl = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
    this.apiKey = process.env.EVOLUTION_API_KEY || '';
    this.instanceName = process.env.EVOLUTION_INSTANCE_NAME || 'default';
  }

  /**
   * Envia uma mensagem de texto via Evolution API
   */
  async sendTextMessage({ number, text }: SendTextMessageParams): Promise<boolean> {
    try {
      // Normaliza o número limpando caracteres especiais
      const cleanNumber = number.replace(/\D/g, '');

      const endpoint = `${this.baseUrl}/message/sendText/${this.instanceName}`;
      
      const response = await axios.post(
        endpoint,
        {
          number: cleanNumber,
          options: {
            delay: 1200,
            presence: 'composing',
            linkPreview: false
          },
          textMessage: {
            text: text
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'apikey': this.apiKey
          },
          timeout: 10000
        }
      );

      return response.status === 200 || response.status === 201;
    } catch (error: any) {
      console.error('[EvolutionService] Erro ao enviar mensagem WhatsApp:', error?.response?.data || error.message);
      return false;
    }
  }
}

export const evolutionService = new EvolutionService();