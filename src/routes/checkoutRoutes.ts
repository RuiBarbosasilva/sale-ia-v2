import { Router, Request, Response } from 'express';
import { Prisma, PrismaClient } from '@prisma/client';
import { adminAuthorization } from '../middlewares/security';
import { generatePixPayload, generatePixImageBase64 } from '../services/pixService';

const router = Router();
const prisma = new PrismaClient();

router.post('/generate-pix', async (req: Request, res: Response) => {
  const totalValue = Number(req.body?.totalValue);
  if (!Number.isFinite(totalValue) || totalValue <= 0) {
    return res.status(400).json({ error: 'INVALID_AMOUNT' });
  }

  const pixKey = String(process.env.PIX_KEY || '').trim();
  if (!pixKey) {
    return res.status(503).json({
      error: 'PIX_NOT_CONFIGURED',
      message: 'Configure PIX_KEY antes de gerar cobranças PIX.'
    });
  }

  const merchantName = String(process.env.PIX_NAME || 'SALE IA').trim();
  const merchantCity = String(process.env.PIX_CITY || 'POCOS DE CALDAS').trim();

  try {
    // Lead, pedido e PIX são gravados na mesma transação. Se a geração do QR
    // ou qualquer gravação falhar, nenhum registro parcial permanece no banco.
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const lead = await tx.lead.create({
        data: {
          name: 'Cliente Avulso ' + Date.now(),
          email: 'avulso-' + Date.now() + '@sale-ia.local',
          phone: String(Date.now()).slice(-10)
        }
      });

      const order = await tx.order.create({
        data: {
          leadId: lead.id,
          totalValue,
          status: 'PENDING'
        }
      });

      // Preserva a parte final do ID para reduzir risco de colisão após truncamento.
      const txId = order.id.replace(/[^a-zA-Z0-9]/g, '').slice(-25).toUpperCase();
      if (!txId) {
        throw new Error('Não foi possível gerar um identificador PIX válido.');
      }

      const pixCode = generatePixPayload({
        key: pixKey,
        name: merchantName,
        city: merchantCity,
        amount: totalValue,
        txId
      });
      const qrCodeUrl = await generatePixImageBase64(pixCode);
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

      const pix = await tx.pixPayment.create({
        data: {
          orderId: order.id,
          pixCode,
          qrCodeUrl,
          expiresAt
        }
      });

      return { order, pix };
    });

    return res.json({
      success: true,
      paymentMode: 'STATIC_PIX',
      confirmation: 'A confirmação automática depende de um gateway/webhook autenticado. O QR gerado não confirma o recebimento por si só.',
      ...result
    });
  } catch (error) {
    console.error('[CHECKOUT PIX ERROR]', error);
    return res.status(500).json({ error: 'PIX_GENERATION_FAILED' });
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
  } catch (error) {
    console.error('[CHECKOUT PIX STATUS ERROR]', error);
    return res.status(500).json({ error: 'PAYMENT_STATUS_UNAVAILABLE' });
  }
});

router.post('/pix/:orderId/simulate-payment', adminAuthorization, async (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'NOT_FOUND' });
  }
  try {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.pixPayment.update({
        where: { orderId: req.params.orderId },
        data: { status: 'PAID', paidAt: new Date() }
      });
      await tx.order.update({
        where: { id: req.params.orderId },
        data: { status: 'PAID' }
      });
    });
    return res.json({ success: true, message: 'Pagamento confirmado!' });
  } catch (error) {
    console.error('[CHECKOUT PIX SIMULATION ERROR]', error);
    return res.status(500).json({ error: 'PAYMENT_SIMULATION_FAILED' });
  }
});

export default router;
