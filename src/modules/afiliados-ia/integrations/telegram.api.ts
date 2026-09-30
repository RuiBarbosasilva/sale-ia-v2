import axios from 'axios';

export class TelegramAPI {
  private botToken = process.env.TELEGRAM_BOT_TOKEN || '';
  private chatId = process.env.TELEGRAM_CHAT_ID || '';

  async enviarMensagem(texto: string) {
    if (!this.botToken || !this.chatId) {
      throw new Error('TELEGRAM_BOT_TOKEN ou TELEGRAM_CHAT_ID nao configurados no .env');
    }

    try {
      const url = 'https://api.telegram.org/bot' + this.botToken + '/sendMessage';
      const response = await axios.post(url, {
        chat_id: this.chatId,
        text: texto,
        parse_mode: 'Markdown',
        disable_web_page_preview: false
      });

      console.log('[Telegram] Mensagem enviada com sucesso! Message ID: ' + response.data.result.message_id);
      return response.data.result.message_id;
    } catch (error: any) {
      console.error('[Telegram] Erro ao enviar:', error.response?.data || error.message);
      throw error;
    }
  }
}
