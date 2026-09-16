import nodemailer from 'nodemailer';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      const mailOptions: nodemailer.SendMailOptions = {
        from: process.env.SMTP_FROM || '"SALE-IA-V2" <noreply@saleia.com>',
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || options.html.replace(/<[^>]*>/g, ''),
      };
      const info = await this.transporter.sendMail(mailOptions);
      console.log('[EMAIL] Email enviado:', info.messageId);
      return true;
    } catch (error: any) {
      console.error('[EMAIL] Erro ao enviar:', error.message);
      return false;
    }
  }

  generateCatalogEmail(customerName: string, products: any[]) {
    const productsHtml = products.map(p => 
      '<tr>' +
      '<td style="padding: 10px; border-bottom: 1px solid #eee;">' + p.name + '</td>' +
      '<td style="padding: 10px; border-bottom: 1px solid #eee;">' + p.description + '</td>' +
      '<td style="padding: 10px; border-bottom: 1px solid #eee;">R$ ' + p.price.toFixed(2) + '</td>' +
      '</tr>'
    ).join('');

    return '<!DOCTYPE html>' +
      '<html><head><meta charset="UTF-8">' +
      '<style>' +
      'body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }' +
      '.container { max-width: 600px; margin: 0 auto; padding: 20px; }' +
      '.header { background: #2563eb; color: white; padding: 20px; text-align: center; }' +
      '.content { padding: 20px; background: #f9f9f9; }' +
      'table { width: 100%; border-collapse: collapse; background: white; }' +
      'th { background: #2563eb; color: white; padding: 12px; text-align: left; }' +
      '.footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }' +
      '.button { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }' +
      '</style></head>' +
      '<body><div class="container">' +
      '<div class="header"><h1>SALE-IA-V2</h1><p>Brindes Personalizados</p></div>' +
      '<div class="content">' +
      '<p>Ola, <strong>' + customerName + '</strong>!</p>' +
      '<p>Segue nosso catalogo de produtos:</p>' +
      '<table><thead><tr><th>Produto</th><th>Descricao</th><th>Preco</th></tr></thead><tbody>' +
      productsHtml +
      '</tbody></table>' +
      '<p style="text-align: center;"><a href="https://wa.me/5511999999999" class="button">Solicitar Orcamento</a></p>' +
      '</div>' +
      '<div class="footer"><p>(c) 2026 SALE-IA-V2. Todos os direitos reservados.</p><p>Para sair desta lista, responda com "SAIR"</p></div>' +
      '</div></body></html>';
  }

  generateWelcomeEmail(customerName: string) {
    return '<!DOCTYPE html><html><head><meta charset="UTF-8"></head>' +
      '<body style="font-family: Arial, sans-serif; line-height: 1.6;">' +
      '<div style="max-width: 600px; margin: 0 auto; padding: 20px;">' +
      '<h1 style="color: #2563eb;">Bem-vindo!</h1>' +
      '<p>Ola, <strong>' + customerName + '</strong>!</p>' +
      '<p>Obrigado pelo seu interesse em nossos brindes personalizados.</p>' +
      '<p>Em breve entraremos em contato com uma proposta especial.</p>' +
      '<p>Atenciosamente,<br>Equipe SALE-IA-V2</p>' +
      '</div></body></html>';
  }

  generateFollowUpEmail(customerName: string, productName: string) {
    return '<!DOCTYPE html><html><head><meta charset="UTF-8"></head>' +
      '<body style="font-family: Arial, sans-serif; line-height: 1.6;">' +
      '<div style="max-width: 600px; margin: 0 auto; padding: 20px;">' +
      '<h2 style="color: #2563eb;">Acompanhamento</h2>' +
      '<p>Ola, <strong>' + customerName + '</strong>!</p>' +
      '<p>Gostaria de saber se voce tem interesse no produto: <strong>' + productName + '</strong></p>' +
      '<p>Estamos com condicoes especiais esta semana!</p>' +
      '<p>Entre em contato: <a href="https://wa.me/5511999999999">WhatsApp</a></p>' +
      '</div></body></html>';
  }
}

export const emailService = new EmailService();