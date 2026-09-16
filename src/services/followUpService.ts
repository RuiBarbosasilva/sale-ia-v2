import { PrismaClient } from '@prisma/client';
import { outreachService } from './outreachService';

const prisma = new PrismaClient();

export class FollowUpService {
  
  // Agenda follow-ups iniciais após o primeiro envio
  async scheduleFollowUps(leadId: string) {
    const now = new Date();
    const intervals = [3, 7, 14]; // Dias para o 1º, 2º e 3º follow-up
    
    for (let i = 0; i < intervals.length; i++) {
      const scheduledDate = new Date(now);
      scheduledDate.setDate(scheduledDate.getDate() + intervals[i]);
      
      await prisma.followUp.create({
        data: {
          leadId,
          sequenceNumber: i + 1,
          scheduledFor: scheduledDate,
          status: 'PENDING'
        }
      });
    }
  }

  // O "Job" diário que roda e executa os follow-ups pendentes
  async executePendingFollowUps() {
    const now = new Date();
    const pendingFollowUps = await prisma.followUp.findMany({
      where: {
        status: 'PENDING',
        scheduledFor: { lte: now }
      },
      include: { lead: true }
    });

    let executed = 0;
    let skipped = 0;

    for (const followUp of pendingFollowUps) {
      // Verificar se o lead já respondeu ou está em opt-out
      const lastOutreach = await prisma.outreach.findFirst({
        where: { leadId: followUp.leadId },
        orderBy: { sentAt: 'desc' }
      });

      // Se o último envio teve resposta (simulado por um status 'REPLIED' ou se o lead mudou de stage)
      if (lastOutreach && lastOutreach.status === 'REPLIED') {
        await prisma.followUp.update({
          where: { id: followUp.id },
          data: { status: 'SKIPPED', message: 'Lead ja respondeu' }
        });
        skipped++;
        continue;
      }

      // Gerar mensagem de follow-up persuasiva
      const followUpMessages = [
        `Ola! Vi que voce recebeu nossa mensagem sobre nossos brindes personalizados. Ainda tem interesse em receber nosso catalogo?`,
        `Opa! Passando so para lembrar da nossa oferta especial. Temos poucas unidades com esse preco. Quer garantir a sua?`,
        `Oi! Esta e nossa ultima tentativa de contato sobre esta oferta. Se nao tiver interesse, avise para nao incomodarmos mais. Abs!`
      ];
      
      const message = followUpMessages[followUp.sequenceNumber - 1] || followUpMessages[0];

      // Enviar via OutreachService
      try {
        await outreachService.sendCampaign([followUp.leadId], message, 'WHATSAPP');
        await prisma.followUp.update({
          where: { id: followUp.id },
          data: { status: 'SENT', executedAt: new Date(), message }
        });
        executed++;
      } catch (error) {
        await prisma.followUp.update({
          where: { id: followUp.id },
          data: { status: 'FAILED', executedAt: new Date() }
        });
      }
    }

    return { executed, skipped, total: pendingFollowUps.length };
  }
}

export const followUpService = new FollowUpService();

export class ResponseDetectionService {
  // Classifica a resposta do lead (pode ser integrado com webhook do WhatsApp futuramente)
  classifyResponse(text: string): 'INTERESTED' | 'NOT_INTERESTED' | 'QUESTION' | 'UNKNOWN' {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('quero') || lowerText.includes('tenho interesse') || lowerText.includes('sim') || lowerText.includes('preco') || lowerText.includes('orcamento')) {
      return 'INTERESTED';
    }
    if (lowerText.includes('nao') || lowerText.includes('não') || lowerText.includes('sair') || lowerText.includes('pare')) {
      return 'NOT_INTERESTED';
    }
    if (lowerText.includes('?') || lowerText.includes('como') || lowerText.includes('quando')) {
      return 'QUESTION';
    }
    return 'UNKNOWN';
  }
}

export const responseDetectionService = new ResponseDetectionService();