const fs = require('fs');

console.log('🔧 Correção definitiva do Checkout PIX\n');

// ============================================================
// 1. ATUALIZAR SCHEMA PRISMA
// ============================================================
console.log('[1/3] Atualizando schema.prisma...');
const schemaPath = 'prisma/schema.prisma';
let schema = fs.readFileSync(schemaPath, 'utf8');

// 1a. Tornar leadId opcional no Order (para permitir venda avulsa)
if (schema.includes('leadId     String\n')) {
    schema = schema.replace(
        'leadId     String\n',
        'leadId     String?\n'
    );
    console.log('  ✅ leadId agora é opcional no Order');
}

// 1b. Tornar totalValue opcional (fallback)
if (schema.match(/totalValue\s+Float\n/)) {
    schema = schema.replace(
        /totalValue\s+Float\n/,
        'totalValue Float?\n'
    );
    console.log('  ✅ totalValue agora é opcional no Order');
}

// 1c. Adicionar modelo PixPayment (se não existir)
if (!schema.includes('model PixPayment')) {
    const pixModel = `
model PixPayment {
  id        String   @id @default(uuid())
  orderId   String   @unique
  order     Order    @relation(fields: [orderId], references: [id])
  pixCode   String   @db.Text
  qrCodeUrl String
  status    String   @default("PENDING")
  expiresAt DateTime
  paidAt    DateTime?
  createdAt DateTime @default(now())
}
`;
    schema = schema.trimEnd() + '\n' + pixModel;
    console.log('  ✅ Modelo PixPayment adicionado');
} else {
    console.log('  ️ Modelo PixPayment já existe');
}

fs.writeFileSync(schemaPath, schema, 'utf8');

// ============================================================
// 2. REESCREVER CHECKOUTROUTES.TS
// ============================================================
console.log('\n[2/3] Reescrevendo checkoutRoutes.ts...');
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

    // Criar pedido (leadId é opcional)
    const order = await prisma.order.create({
      data: { 
        leadId: leadId || null,
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
console.log('  ✅ checkoutRoutes.ts reescrito');

// ============================================================
// 3. ATUALIZAR FRONTEND
// ============================================================
console.log('\n[3/3] Atualizando frontend...');
const jsPath = 'public/app-v3.js';
let js = fs.readFileSync(jsPath, 'utf8');

// Garantir que usa totalValue em vez de amount
if (js.includes('JSON.stringify({ amount, productId })')) {
    js = js.replace(
        'JSON.stringify({ amount, productId })',
        'JSON.stringify({ totalValue: amount })'
    );
    console.log('  ✅ Frontend atualizado para usar totalValue');
}

fs.writeFileSync(jsPath, js, 'utf8');

console.log('\n' + '='.repeat(60));
console.log('  CORREÇÃO CONCLUÍDA!');
console.log('='.repeat(60));
console.log('\n⚠️  IMPORTANTE - Execute na ORDEM EXATA:');
console.log('\n1. PRIMEIRO, pare o servidor (Ctrl + C no terminal onde está rodando)');
console.log('   (Isso libera o arquivo .dll travado)');
console.log('\n2. Depois execute:');
console.log('   npx prisma generate');
console.log('   npm run build');
console.log('   npm start');
console.log('\n3. No navegador: Ctrl + Shift + R');
console.log('4. Vá em Checkout PIX e teste!');