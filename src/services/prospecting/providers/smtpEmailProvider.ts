// src/services/prospecting/providers/smtpEmailProvider.ts

import { EmailProvider, EmailMessage, EmailSendResult, EmailProviderStatus } from './emailProvider';

export class SmtpEmailProvider implements EmailProvider {
  readonly name = 'SMTP';
  private readonly enabled: boolean;
  private readonly host: string;
  private readonly port: number;
  private readonly user: string;
  private readonly from: string;

  constructor() {
    this.enabled = process.env.EMAIL_ENABLED === 'true';
    this.host = process.env.EMAIL_SMTP_HOST || '';
    this.port = parseInt(process.env.EMAIL_SMTP_PORT || '587', 10);
    this.user = process.env.EMAIL_SMTP_USER || '';
    this.from = process.env.EMAIL_FROM || '';
  }

  getStatus(): EmailProviderStatus {
    if (!this.enabled) return 'NOT_CONFIGURED';
    if (!this.host || !this.user) return 'NOT_CONFIGURED';
    return 'CONFIGURED';
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    const status = this.getStatus();
    if (status === 'NOT_CONFIGURED') {
      return {
        success: false,
        error: 'EMAIL_NOT_CONFIGURED: SMTP nao configurado. Defina EMAIL_ENABLED=true e credenciais.',
      };
    }

    try {
      let nodemailer: any;
      try {
        nodemailer = require('nodemailer');
      } catch {
        return {
          success: false,
          error: 'NODEMAILER_NOT_INSTALLED: Execute npm install nodemailer para habilitar envio.',
        };
      }

      const transporter = nodemailer.createTransport({
        host: this.host,
        port: this.port,
        secure: this.port === 465,
        auth: {
          user: this.user,
          pass: process.env.EMAIL_SMTP_PASS || '',
        },
      });

      const info = await transporter.sendMail({
        from: message.from || this.from,
        to: message.to,
        subject: message.subject,
        text: message.body,
        replyTo: message.replyTo,
      });

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error: any) {
      return {
        success: false,
        error: `EMAIL_SEND_FAILED: ${error.message}`,
      };
    }
  }
}

export const smtpEmailProvider = new SmtpEmailProvider();