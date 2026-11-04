import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { adminAuthorization } from '../middlewares/security';

const router = Router();
const prisma = new PrismaClient();

router.post('/generate-pix', async (req: Request, res: Response) => {
  try {
    const { totalValue } = req.body;
    if (!totalValue || totalValue <= 0) return res.status(400).json({ error: 'Valor invalido' });

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
        totalValue: totalValue, 
        status: 'PENDING' 
      }
    });

    const pixCode = '00020126580014BR.GOV.BCB.PIX0136' + order.id + '-sale-ia-v25204000053039865802BR5913SALE-IA-V26009SAO PAULO62070503***6304' + (Math.floor(Math.random() * 9000) + 1000);
    const qrCodeUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=' + encodeURIComponent(pixCode);
    const expiresAt = new Date(); 
    expiresAt.setMinutes(expiresAt.getMinutes() + 30);

    const pix = await prisma.pixPayment.create({ 
      data: { 
        orderId: order.id, 
        pixCode, 
        qrCodeUrl, 
        expiresAt 
      } 
    });

    return res.json({ success: true, order, pix });
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