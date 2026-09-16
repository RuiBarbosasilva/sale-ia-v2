import { Router, Request, Response } from 'express';
import { automationService } from '../services/automationService';

const router = Router();

export const handleWebhook = async (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const messageData = body.data || body;

    const key = messageData?.key || body?.key || {};
    const fromMe = key?.fromMe === true || body?.fromMe === true;
    const remoteJid = key?.remoteJid || body?.remoteJid || '';

    // Filtro 1: Mensagens enviadas pelo próprio bot/usuário (fromMe)
    if (fromMe) {
      return res.status(200).json({ status: 'RECEIVED' });
    }

    // Filtro 2: Mensagens de grupos (@g.us)
    if (remoteJid.endsWith('@g.us') || remoteJid.includes('@g.us')) {
      return res.status(200).json({ status: 'RECEIVED' });
    }

    // Extração do texto da mensagem
    const messageText =
      messageData?.message?.conversation ||
      messageData?.message?.extendedTextMessage?.text ||
      body?.message?.conversation ||
      body?.message?.extendedTextMessage?.text ||
      body?.text ||
      '';

    // Filtro 3: Payloads sem texto ou mensagem vazia
    if (!messageText || typeof messageText !== 'string' || messageText.trim() === '') {
      return res.status(200).json({ status: 'RECEIVED' });
    }

    const phone = remoteJid.replace('@s.whatsapp.net', '').replace('@c.us', '');
    const pushName = messageData?.pushName || body?.pushName || 'Lead Webhook';

    // O automationService realiza o processamento E o disparo do sendTextMessage via Evolution
    await automationService.processAndRespondLead({
      phone,
      message: messageText,
      name: pushName,
    });

    return res.status(200).json({ status: 'RECEIVED' });
  } catch (error: any) {
    console.error('Erro no webhook:', error);
    const errorMessage = error?.message || 'Internal Server Error';
    return res.status(500).json({ error: errorMessage });
  }
};

router.post('/whatsapp', handleWebhook);
router.post('/', handleWebhook);

export default router;