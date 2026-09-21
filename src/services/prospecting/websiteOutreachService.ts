// src/services/prospecting/websiteOutreachService.ts

import { createHash } from 'crypto';
import { prisma } from '../../modules/mercadoLivre/lib/prisma';
import { emailManager } from './providers/emailProvider';
import { smtpEmailProvider } from './providers/smtpEmailProvider';

emailManager.registerProvider(smtpEmailProvider);

export class WebsiteOutreachService {
  
  async prepareOutreach(prospectId: string): Promise<any> {
    const prospect = await prisma.websiteProspect.findUnique({
      where: { id: prospectId },
      include: { demos: { orderBy: { version: 'desc' }, take: 1 } },
    });

    if (!prospect) {
      throw new Error('PROSPECT_NOT_FOUND');
    }

    const latestDemo = prospect.demos[0];

    if (!latestDemo) {
      throw new Error('NO_DEMO_AVAILABLE: Gere uma demo antes de preparar o outreach');
    }

    if (latestDemo.status !== 'READY') {
      throw new Error('DEMO_NOT_READY: A demo mais recente ainda nao foi aprovada pelo controle de qualidade');
    }

    let previewData: any = {};
    try {
      previewData = JSON.parse(latestDemo.previewData || '{}');
    } catch {
      previewData = {};
    }

    const qualityScore = Number(previewData.qualityReview?.overallScore || 0);
    const criticalIssues = Array.isArray(previewData.qualityReview?.criticalIssues)
      ? previewData.qualityReview.criticalIssues
      : [];

    if (qualityScore < 7.5 || criticalIssues.length > 0) {
      throw new Error('DEMO_QUALITY_GATE: A demo precisa atingir score 7.5 e nao possuir problemas criticos antes do outreach');
    }

    const subject = `Uma nova ideia de site para ${prospect.companyName}`;
    
    const body = this.generateOutreachCopy(prospect, latestDemo);

    const idempotencyKey = this.generateIdempotencyKey(prospectId, 'EMAIL', subject);

    const existingOutreach = await prisma.websiteOutreach.findUnique({
      where: { idempotencyKey },
    });

    if (existingOutreach) {
      return {
        success: true,
        outreachId: existingOutreach.id,
        status: existingOutreach.status,
        message: 'Outreach ja preparado anteriormente (idempotente)',
      };
    }

    const outreach = await prisma.websiteOutreach.create({
      data: {
        prospectId,
        channel: 'EMAIL',
        status: 'READY',
        subject,
        body,
        recipient: prospect.email,
        idempotencyKey,
      },
    });

    await this.logEvent(outreach.id, 'OUTREACH_PREPARED', 'Copy de outreach preparada');

    await prisma.websiteProspect.update({
      where: { id: prospectId },
      data: { emailStatus: 'READY' },
    });

    return {
      success: true,
      outreachId: outreach.id,
      subject,
      body,
      status: 'READY',
    };
  }

  async sendOutreach(prospectId: string): Promise<any> {
    const prospect = await prisma.websiteProspect.findUnique({
      where: { id: prospectId },
    });

    if (!prospect) {
      throw new Error('PROSPECT_NOT_FOUND');
    }

    if (!prospect.email) {
      return {
        success: false,
        status: 'NO_EMAIL',
        message: 'Prospect nao possui e-mail cadastrado',
      };
    }

    const outreach = await prisma.websiteOutreach.findFirst({
      where: { prospectId, channel: 'EMAIL' },
      orderBy: { createdAt: 'desc' },
    });

    if (!outreach) {
      return {
        success: false,
        status: 'NOT_READY',
        message: 'Prepare o outreach antes de enviar',
      };
    }

    if (outreach.status === 'SENT') {
      return {
        success: false,
        status: 'ALREADY_SENT',
        message: 'E-mail ja enviado anteriormente (idempotente)',
      };
    }

    // Claim atomico: evita dois workers/processos enviarem o mesmo e-mail
    // simultaneamente. SENDING antigo pode ser recuperado apos 15 minutos.
    const staleBefore = new Date(Date.now() - 15 * 60 * 1000);
    const claim = await prisma.websiteOutreach.updateMany({
      where: {
        id: outreach.id,
        OR: [
          { status: 'READY' },
          { status: 'SENDING', updatedAt: { lt: staleBefore } },
        ],
      },
      data: { status: 'SENDING' },
    });

    if (claim.count !== 1) {
      const current = await prisma.websiteOutreach.findUnique({ where: { id: outreach.id } });
      return {
        success: false,
        status: current?.status || 'NOT_READY',
        message: current?.status === 'SENT'
          ? 'E-mail ja enviado anteriormente (idempotente)'
          : 'Outreach ja esta em processamento por outro worker',
      };
    }

    const emailStatus = emailManager.getStatus();
    const activeProvider = emailManager.getActiveProvider();

    if (!activeProvider) {
      await this.logEvent(outreach.id, 'OUTREACH_FAILED', 'Email provider nao configurado');
      
      return {
        success: false,
        status: 'EMAIL_NOT_CONFIGURED',
        providers: emailStatus,
        message: 'Nenhum provider de e-mail configurado. Configure EMAIL_ENABLED=true no .env',
      };
    }

    const result = await emailManager.send({
      to: prospect.email,
      subject: outreach.subject || '',
      body: outreach.body || '',
    });

    if (result.success) {
      await prisma.websiteOutreach.update({
        where: { id: outreach.id },
        data: {
          status: 'SENT',
          messageId: result.messageId,
          provider: activeProvider.name,
          sentAt: new Date(),
        },
      });

      await prisma.websiteProspect.update({
        where: { id: prospectId },
        data: {
          emailStatus: 'SENT',
          contactedAt: new Date(),
          lastContactAt: new Date(),
        },
      });

      await this.logEvent(outreach.id, 'OUTREACH_SENT', `E-mail enviado via ${activeProvider.name}`);

      return {
        success: true,
        status: 'SENT',
        messageId: result.messageId,
      };
    } else {
      await prisma.websiteOutreach.update({
        where: { id: outreach.id },
        data: {
          status: 'FAILED',
          error: result.error,
        },
      });

      await this.logEvent(outreach.id, 'OUTREACH_FAILED', `Erro: ${result.error}`);

      return {
        success: false,
        status: 'FAILED',
        error: result.error,
      };
    }
  }

  async getWhatsAppLink(prospectId: string): Promise<any> {
    const prospect = await prisma.websiteProspect.findUnique({
      where: { id: prospectId },
    });

    if (!prospect) {
      throw new Error('PROSPECT_NOT_FOUND');
    }

    if (!prospect.whatsapp && !prospect.phone) {
      return {
        success: false,
        status: 'NO_WHATSAPP',
        message: 'Prospect nao possui WhatsApp/telefone',
      };
    }

    const phone = prospect.whatsapp || prospect.phone || '';
    const digits = phone.replace(/\D/g, '');
    const whatsappNumber = digits.startsWith('55') ? digits : `55${digits}`;
    
    const suggestedMessage = this.generateWhatsAppCopy(prospect);
    const whatsappLink = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(suggestedMessage)}`;

    await this.logOutreachEvent(prospectId, 'WHATSAPP_MANUAL_OPENED', 'Link WhatsApp gerado para abordagem manual');

    return {
      success: true,
      whatsappLink,
      phone: prospect.phone,
      suggestedMessage,
      note: 'Abordagem manual - o sistema NAO dispara mensagens automaticamente',
    };
  }

  private generateOutreachCopy(prospect: any, demo: any): string {
    const name = prospect.contactPerson || prospect.companyName;
    
    return `Ola, ${name}.

Preparei uma demonstracao de uma nova apresentacao digital para ${prospect.companyName}, considerando o negocio e a regiao em que voces atuam${prospect.city ? ` (${prospect.city})` : ''}.

A demonstracao foi criada com base nas informacoes publicas disponiveis sobre a empresa, com foco em presenca digital profissional e captacao de clientes.

Se fizer sentido, posso apresentar a proposta completa e ajustar conforme suas necessidades.

Estou a disposicao para conversar.

Atenciosamente,
RB Factory Sites`;
  }

  private generateWhatsAppCopy(prospect: any): string {
    return `Ola! Preparei uma demonstracao de site para ${prospect.companyName}. Gostaria de apresentar quando for conveniente. Posso enviar o link da demo?`;
  }

  private generateIdempotencyKey(prospectId: string, channel: string, subject: string): string {
    const content = `${prospectId}:${channel}:${subject}`;
    return createHash('sha256').update(content).digest('hex');
  }

  private async logEvent(outreachId: string, type: string, description: string) {
    try {
      await prisma.websiteOutreachEvent.create({
        data: {
          outreachId,
          type,
          description,
        },
      });
    } catch (error) {
      console.error('[Outreach] Failed to log event:', error);
    }
  }

  private async logOutreachEvent(prospectId: string, type: string, description: string) {
    try {
      await prisma.websiteProspectEvent.create({
        data: {
          prospectId,
          type,
          description,
        },
      });
    } catch (error) {
      console.error('[Outreach] Failed to log prospect event:', error);
    }
  }
}

export const websiteOutreachService = new WebsiteOutreachService();