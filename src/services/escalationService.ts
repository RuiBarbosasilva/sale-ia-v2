import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface EscalationData {
  phone: string;
  customerName?: string;
  productName: string;
  requestedDiscount: number;
  lastQuoteTotal: number;
  reason: string;
}

export class EscalationService {
  async notifySalesTeam(data: EscalationData) {
    console.log('\n==============================================');
    console.log('?? ALERTA: SOLICITAã£â€¡ã£Â£O DE INTERVENã£â€¡ã£Â£O HUMANA');
    console.log('==============================================');
    console.log(`?? Cliente: ${data.customerName || 'Nã£Â£o informado'} (${data.phone})`);
    console.log(`: ${data.productName}`);
    console.log(`o Solicitado: ${data.requestedDiscount}%`);
    console.log(`${data.reason}`);
    console.log('==============================================\n');

    try {
      await prisma.lead.updateMany({
        where: { phone: data.phone },
        data: {
          stage: "HUMAN_ATTENDANCE",
          updatedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Erro ao atualizar status do lead no banco:', error);
    }

    return {
      success: true,
      notifiedAt: new Date(),
      leadStatus: 'HUMAN_HANDOVER'
    };
  }
}

export const escalationService = new EscalationService();



