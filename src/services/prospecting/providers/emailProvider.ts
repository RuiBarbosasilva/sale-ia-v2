// src/services/prospecting/providers/emailProvider.ts

export interface EmailMessage {
  to: string;
  subject: string;
  body: string;
  from?: string;
  replyTo?: string;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export type EmailProviderStatus = 'CONFIGURED' | 'NOT_CONFIGURED' | 'ERROR';

export interface EmailProvider {
  readonly name: string;
  getStatus(): EmailProviderStatus;
  send(message: EmailMessage): Promise<EmailSendResult>;
}

export class EmailManager {
  private providers: EmailProvider[] = [];

  registerProvider(provider: EmailProvider): void {
    this.providers.push(provider);
  }

  getStatus(): { provider: string; status: EmailProviderStatus }[] {
    return this.providers.map(p => ({ provider: p.name, status: p.getStatus() }));
  }

  getActiveProvider(): EmailProvider | null {
    return this.providers.find(p => p.getStatus() === 'CONFIGURED') || null;
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    const provider = this.getActiveProvider();
    if (!provider) {
      return {
        success: false,
        error: 'EMAIL_NOT_CONFIGURED: Configure EMAIL_ENABLED=true e as credenciais no .env para enviar e-mails reais.',
      };
    }
    return provider.send(message);
  }
}

export const emailManager = new EmailManager();