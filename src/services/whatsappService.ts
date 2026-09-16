import axios from 'axios';

class WhatsAppService {
  private apiUrl: string;
  private apiKey: string;
  private instanceName: string;

  constructor() {
    this.apiUrl = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
    this.apiKey = process.env.EVOLUTION_API_KEY || '';
    this.instanceName = process.env.EVOLUTION_INSTANCE_NAME || 'sale_ia';
  }

  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      'apikey': this.apiKey,
    };
  }

  async sendText(phone: string, text: string): Promise<any> {
    try {
      const cleanPhone = phone.replace(/\D/g, '');
      const response = await axios.post(
        `${this.apiUrl}/message/sendText/${this.instanceName}`,
        {
          number: cleanPhone,
          text: text,
        },
        { headers: this.getHeaders() }
      );
      console.log(`[WHATSAPP] Texto enviado para ${cleanPhone}`);
      return response.data;
    } catch (error: any) {
      console.error(`[WHATSAPP] Erro ao enviar texto para ${phone}:`, error.response?.data || error.message);
      throw error;
    }
  }

  async sendImage(phone: string, imageUrl: string, caption: string): Promise<any> {
    try {
      const cleanPhone = phone.replace(/\D/g, '');
      const response = await axios.post(
        `${this.apiUrl}/message/sendMedia/${this.instanceName}`,
        {
          number: cleanPhone,
          mediatype: 'image',
          media: imageUrl,
          caption: caption,
        },
        { headers: this.getHeaders() }
      );
      console.log(`[WHATSAPP] Imagem enviada para ${cleanPhone}`);
      return response.data;
    } catch (error: any) {
      console.error(`[WHATSAPP] Erro ao enviar imagem para ${phone}:`, error.response?.data || error.message);
      throw error;
    }
  }

  async checkNumber(phone: string): Promise<boolean> {
    try {
      const cleanPhone = phone.replace(/\D/g, '');
      const response = await axios.post(
        `${this.apiUrl}/chat/whatsappNumbers/${this.instanceName}`,
        { numbers: [cleanPhone] },
        { headers: this.getHeaders() }
      );
      const exists = response.data?.[0]?.exists;
      return exists === true;
    } catch (error) {
      console.error(`[WHATSAPP] Erro ao verificar numero ${phone}:`, error);
      return false;
    }
  }
}

export const whatsappService = new WhatsAppService();