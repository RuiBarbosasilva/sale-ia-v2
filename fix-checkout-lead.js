const fs = require('fs');

console.log('🔧 Corrigindo checkout para criar lead automático...\n');

// Reescrever checkoutRoutes.ts para criar lead se não existir
const routesPath = 'src/routes/checkoutRoutes.ts';

const newRoutes = `import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Gerar PIX
router.post('/generate-pix', async (req: Request, res: Response) => {
  try {
    const { leadId, totalValue } = req.body;
    
    if (!totalValue || totalValue <= 0) {
      return res.status(400).json({ error: 'Valor invalido' });
    }

    let finalLeadId = leadId;

    // Se não tem leadId, cria um lead "Cliente Avulso"
    if (!leadId) {
      const walkInLead = await prisma.lead.create({
        data: {
          name: 'Cliente Avulso',
          email: 'walkin@sale-ia.local',
          phone: '000000000',
          source: 'CHECKOUT_PIX'
        }
      });
      finalLeadId = walkInLead.id;
      console.log('Lead avulso criado:', finalLeadId);
    }

    // Criar pedido com lead garantido
    const order = await prisma.order.create({
      data: { 
        leadId: finalLeadId,
        totalValue: totalValue,
        status: 'PENDING'
      }
    });

    // Gerar código PIX simulado
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
    console.error('Erro ao gerar PIX:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Consultar status
router.get('/pix/:orderId/status', async (req: Request, res: Response) => {
  try {
    const pix = await prisma.pixPayment.findUnique({
      where: { orderId: req.params.orderId },
      include: { order: true }
    });

    if (!pix) return res.status(404).json({ error: 'Pagamento nao encontrado' });

    let currentStatus = pix.status;
    if (currentStatus === 'PENDING' && new Date() > pix.expiresAt) {
      currentStatus = 'EXPIRED';
      await prisma.pixPayment.update({ where: { id: pix.id }, data: { status: 'EXPIRED' } });
      await prisma.order.update({ where: { id: pix.orderId }, data: { status: 'CANCELLED' } });
    }

    return res.json({ success: true, status: currentStatus, pix });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Simular pagamento
router.post('/pix/:orderId/simulate-payment', async (req: Request, res: Response) => {
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

export default router;`;

fs.writeFileSync(routesPath, newRoutes, 'utf8');
console.log('✅ checkoutRoutes.ts atualizado para criar lead automático');

console.log('\n🎉 Correção concluída!');
console.log('\nAgora execute:');
console.log('1. Pare o servidor (Ctrl + C)');
console.log('2. npm run build');
console.log('3. npm start');
console.log('4. No navegador: Ctrl + Shift + R');
console.log('5. Tente gerar o PIX novamente!');