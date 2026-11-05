import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { adminAuthorization } from '../middlewares/security';
import { generatePixPayload, generatePixImageBase64 } from '../services/pixService';

const router = Router();
const prisma = new PrismaClient();

router.post('/generate-pix', async (req: Request, res: Response) => {
  try {
    const totalValue = Number(req.body?.totalValue);
    if (!Number.isFinite(totalValue) || totalValue <= 0) {
      return res.status(400).json({ error: 'Valor invalido' });
    }

    const pixKey = String(process.env.PIX_KEY || '').trim();
    if (!pixKey) {
      return res.status(503).json({
        error: 'PIX_NOT_CONFIGURED',
        message: 'Configure PIX_KEY antes de gerar cobranças PIX.'
      });
    }

    const merchantName = process.env.PIX_NAME || 'SALE IA';
    const merchantCity = process.env.PIX_CITY || 'POCOS DE CALDAS';

    const lead = await prisma.lead.create({
      data: {
        name: 'Cliente Avulso ' + Date.now(),
        email: 'avulso-' + Date.now() + '@sale-ia.local',
        phone: String(Date.now()).slice(-10)
      }
    });

    const order = await prisma.order.create({
      data: {
        leadId: lead.id,
        totalValue,
        status: 'PENDING'
      }
    });

    // O identificador PIX deve respeitar o limite de 25 caracteres do campo TXID.
    const txId = order.id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 25).toUpperCase();
    const pixCode = generatePixPayload({
      key: pixKey,
      name: merchantName,
      city: merchantCity,
      amount: totalValue,
      txId
    });
    const qrCodeUrl = await generatePixImageBase64(pixCode);

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    const pix = await prisma.pixPayment.create({
      data: {
        orderId: order.id,
        pixCode,
        qrCodeUrl,
        expiresAt
      }
    });

    return res.json({
      success: true,
      paymentMode: 'STATIC_PIX',
      confirmation: 'A confirmação automática depende de um gateway/webhook autenticado. O QR gerado não confirma o recebimento por si só.',
      order,
      pix
    });
  } catch (error: any) {
    console.error('[BACKEND ERROR]', error);
    return res.status(500).json({ error: error.message });
  }
});

router.get('/pix/:orderId/status', async (req: Request, res: Response) => {
  try {
    const pix = await prisma.pixPayment.findUnique({
      where: { orderId: req.params.orderId },
      include: { order: true }
    });
    if (!pix) return res.status(404).json({ error: 'Pagamento nao encontrado' });
    return res.json({ success: true, status: pix.status, pix });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/pix/:orderId/simulate-payment', adminAuthorization, async (req: Request, res: Response) => {
    if (process.env.NODE_ENV === 'production') {
      return res.status(404).json({ error: 'NOT_FOUND' });
    }
  try {
    await prisma.pixPayment.update({
      where: { orderId: req.params.orderId },
      data: { status: 'PAID', paidAt: new Date() }
    });
    await prisma.order.update({
      where: { id: req.params.orderId },
      data: { status: 'PAID' }
    });
    return res.json({ success: true, message: 'Pagamento confirmado!' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;