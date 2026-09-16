import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class OutreachService {
  async sendCampaign(leadIds: string[], creativeText: string, channel: 'WHATSAPP' | 'EMAIL' | 'BOTH') {
    const results = {
      total: leadIds.length,
      sent: 0,
      skipped: 0,
      errors: 0,
      details: [] as any[]
    };

    for (const leadId of leadIds) {
      const lead = await prisma.lead.findUnique({ where: { id: leadId } });
      if (!lead) continue;

      // Verificar Opt-out
      if (lead.status === 'DO_NOT_CONTACT') {
        results.skipped++;
        results.details.push({ leadId, status: 'SKIPPED_OPT_OUT' });
        continue;
      }

      try {
        let sent = false;
        
        // Simulação de envio (em produção, integraria com whatsappService e emailService)
        if (channel === 'WHATSAPP' || channel === 'BOTH') {
          if (lead.phone) {
            console.log(`[WHATSAPP] Enviando para ${lead.phone}: ${creativeText.substring(0, 30)}...`);
            sent = true;
          }
        }
        
        if (channel === 'EMAIL' || channel === 'BOTH') {
          if (lead.email) {
            console.log(`[EMAIL] Enviando para ${lead.email}: ${creativeText.substring(0, 30)}...`);
            sent = true;
          }
        }

        if (sent) {
          results.sent++;
          results.details.push({ leadId, status: 'SENT' });
          
          await prisma.outreach.create({
            data: {
              leadId,
              channel,
              message: creativeText,
              status: 'SENT',
              sentAt: new Date()
            }
          });
        } else {
          results.skipped++;
          results.details.push({ leadId, status: 'SKIPPED_NO_CONTACT_INFO' });
        }
      } catch (error: any) {
        results.errors++;
        results.details.push({ leadId, status: 'ERROR', error: error.message });
        
        await prisma.outreach.create({
          data: {
            leadId,
            channel,
            message: creativeText,
            status: 'FAILED',
            error: error.message,
            sentAt: new Date()
          }
        });
      }
      
      // Delay para evitar rate limit
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return results;
  }
}

export const outreachService = new OutreachService();