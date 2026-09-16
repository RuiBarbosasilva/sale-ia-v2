import { Router, Request, Response } from 'express';
import { emailService } from '../services/emailService';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Enviar email de catálogo
router.post('/send-catalog', async (req: Request, res: Response) => {
  try {
    const { leadId } = req.body;
    
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead || !lead.email) {
      return res.status(400).json({ error: 'Lead sem email cadastrado' });
    }

    // Produtos de exemplo (substituir por consulta real)
    const products = [
      { name: 'Caneca Personalizada', description: 'Cerâmica 300ml', price: 25.00 },
      { name: 'Caneca Mágica', description: 'Revelação com calor', price: 35.00 },
      { name: 'Kit Corporativo', description: 'Caneca + Caneta + Bloco', price: 75.00 },
    ];

    const html = emailService.generateCatalogEmail(lead.name || 'Cliente', products);
    const success = await emailService.sendEmail({
      to: lead.email,
      subject: 'Catálogo de Brindes Personalizados - SALE-IA-V2',
      html
    });

    if (success) {
      return res.json({ success: true, message: 'Catálogo enviado com sucesso' });
    } else {
      return res.status(500).json({ error: 'Falha ao enviar email' });
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Enviar email de boas-vindas
router.post('/send-welcome', async (req: Request, res: Response) => {
  try {
    const { leadId } = req.body;
    
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead || !lead.email) {
      return res.status(400).json({ error: 'Lead sem email cadastrado' });
    }

    const html = emailService.generateWelcomeEmail(lead.name || 'Cliente');
    const success = await emailService.sendEmail({
      to: lead.email,
      subject: 'Bem-vindo à SALE-IA-V2!',
      html
    });

    return res.json({ success, message: success ? 'Email enviado' : 'Falha no envio' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Enviar follow-up
router.post('/send-followup', async (req: Request, res: Response) => {
  try {
    const { leadId, productName } = req.body;
    
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead || !lead.email) {
      return res.status(400).json({ error: 'Lead sem email cadastrado' });
    }

    const html = emailService.generateFollowUpEmail(lead.name || 'Cliente', productName || 'nossos produtos');
    const success = await emailService.sendEmail({
      to: lead.email,
      subject: 'Acompanhamento - SALE-IA-V2',
      html
    });

    return res.json({ success, message: success ? 'Follow-up enviado' : 'Falha no envio' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;