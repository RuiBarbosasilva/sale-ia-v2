import { Router, Request, Response } from 'express';
import { whatsappAutomationService } from '../services/whatsappAutomationService';

const router = Router();

// Handler extraído para evitar erro de tipo no Express
const handleWebhook = async (req: Request, res: Response) => {
  try {
    const data = req.body;
    
    // Estrutura padrao da Evolution API para mensagens recebidas
    if (data.event === 'messages.upsert' && data.data) {
      const messageData = data.data;
      const phone = messageData.key?.remoteJid?.replace('@s.whatsapp.net', '') || '';
      const text = messageData.message?.conversation || messageData.message?.extendedTextMessage?.text || '';
      const fromMe = messageData.key?.fromMe || false;

      if (phone && text) {
        console.log(`[WEBHOOK] Mensagem de ${phone}: ${text.substring(0, 50)}...`);
        
        const result = await whatsappAutomationService.processIncomingMessage(phone, text, fromMe);
        
        if (result.handled) {
          console.log(`[WEBHOOK] Mensagem processada: ${result.reason || 'OK'}`);
        }
      }
    }

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('[WEBHOOK] Erro ao processar webhook:', error.message);
    return res.status(500).json({ error: 'Erro interno no webhook' });
  }
};

// Registrar o mesmo handler em duas rotas para compatibilidade
router.post('/', handleWebhook);
router.post('/whatsapp', handleWebhook);

export default router;