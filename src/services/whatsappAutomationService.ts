import { PrismaClient } from '@prisma/client';
import { whatsappService } from './whatsappService';

const prisma = new PrismaClient();

export class WhatsAppAutomationService {
  async processIncomingMessage(phone: string, text: string, fromMe: boolean) {
    if (fromMe) return { handled: false, reason: 'Mensagem enviada pelo sistema' };

    const cleanPhone = phone.replace(/\D/g, '');
    
    // 1. Verificar Opt-Out (Palavras-chave de cancelamento)
    const optOutKeywords = /^(sair|parar|stop|nao quero|remover|cancelar|unsub)$/i;
    if (optOutKeywords.test(text.trim())) {
      await this.handleOptOut(cleanPhone);
      return { handled: true, reason: 'Opt-out registrado' };
    }

    // 2. Buscar ou criar Lead
    let lead = await prisma.lead.findFirst({ where: { phone: cleanPhone } });
    
    if (!lead) {
      lead = await prisma.lead.create({
        data: {
          phone: cleanPhone,
          name: 'Contato Novo',
          status: 'NEW_LEAD',
          stage: 'NEW'
        }
      });
    }

    // 3. Se lead estiver em DO_NOT_CONTACT, ignorar
    if (lead.status === 'DO_NOT_CONTACT') {
      console.log(`[AUTOMACAO] Mensagem ignorada: Lead ${cleanPhone} esta em DO_NOT_CONTACT`);
      return { handled: true, reason: 'Lead em Do Not Contact' };
    }

    // 4. Salvar a mensagem no banco (usando createdAt, que é padrã£Â£ã‚Â£o do Prisma)
    await prisma.message.create({
      data: {
        leadId: lead.id,
        sender: 'CLIENT',
        content: text
      }
    });

    return { handled: true, leadId: lead.id, status: lead.status };
  }

  private async handleOptOut(phone: string) {
    console.log(`[OPT-OUT] Registrando cancelamento para ${phone}`);
    try {
      // Atualiza o status para DO_NOT_CONTACT (compatã£Â£ã‚Â­vel com qualquer schema)
      await prisma.lead.updateMany({
        where: { phone: phone },
        data: { status: 'DO_NOT_CONTACT' }
      });
      
      await whatsappService.sendText(phone, 'Entendido. Removemos seu numero de nossa lista de contatos.');
    } catch (e) {
      console.error('[OPT-OUT] Falha ao processar:', e);
    }
  }

  async checkRateLimit(phone: string, maxPerHour: number = 5): Promise<boolean> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    try {
      const count = await prisma.message.count({
        where: {
          lead: { phone: phone },
          sender: 'SYSTEM',
          createdAt: { gte: oneHourAgo }
        }
      });
      if (count >= maxPerHour) {
        console.log(`[RATE LIMIT] Limite excedido para ${phone} (${count}/${maxPerHour})`);
        return false;
      }
    } catch (e) {
      console.error('[RATE LIMIT] Erro ao verificar:', e);
    }
    return true;
  }
}

export const whatsappAutomationService = new WhatsAppAutomationService();