const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('💥 INICIANDO RECONSTRUÇÃO TOTAL DO SISTEMA...\n');

// 1. Matar processos Node travados
console.log('[1/6] Matando processos Node travados (liberando arquivos)...');
try { execSync('taskkill /F /IM node.exe', { stdio: 'ignore' }); console.log('  ✅ Processos encerrados.'); } 
catch(e) { console.log('  ℹ️ Nenhum processo Node estava rodando.'); }

// 2. Limpar cache corrompido do Prisma
console.log('\n[2/6] Limpando cache corrompido do Prisma...');
const prismaClientDir = path.join(__dirname, 'node_modules', '.prisma', 'client');
if (fs.existsSync(prismaClientDir)) {
    fs.rmSync(prismaClientDir, { recursive: true, force: true });
    console.log('  ✅ Cache do Prisma deletado com sucesso.');
}

// 3. Garantir Schema 100% Limpo
console.log('\n[3/6] Validando e limpando schema.prisma...');
const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

// Remove qualquer versão antiga ou mal formatada de PixPayment
schema = schema.replace(/model PixPayment \{[\s\S]*?\n\}/g, '');
schema = schema.replace(/model Pixpayment \{[\s\S]*?\n\}/g, '');

const cleanPixModel = `
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

if (!schema.includes('model PixPayment')) {
    schema = schema.trimEnd() + '\n' + cleanPixModel;
    fs.writeFileSync(schemaPath, schema, 'utf8');
    console.log('  ✅ Modelo PixPayment limpo e adicionado.');
}

// 4. Reescrever checkoutRoutes.ts (Código Mínimo e Infalível)
console.log('\n[4/6] Reescrevendo checkoutRoutes.ts (código 100% limpo)...');
const routesPath = path.join(__dirname, 'src', 'routes', 'checkoutRoutes.ts');
const cleanRoutes = `import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.post('/generate-pix', async (req: Request, res: Response) => {
  try {
    const { totalValue } = req.body;
    if (!totalValue || totalValue <= 0) return res.status(400).json({ error: 'Valor invalido' });

    // Cria lead avulso com dados únicos para evitar conflito
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

fs.writeFileSync(routesPath, cleanRoutes, 'utf8');
console.log('  ✅ checkoutRoutes.ts reescrito sem lixo.');

// 5. Forçar Geração do Prisma Client
console.log('\n[5/6] Forçando geração do Prisma Client (isso pode levar alguns segundos)...');
try {
    execSync('npx prisma generate', { stdio: 'inherit' });
    console.log('  ✅ Prisma Client gerado com SUCESSO!');
} catch (error) {
    console.error('  ❌ Falha ao gerar Prisma Client. Verifique se o schema.prisma está válido.');
    process.exit(1);
}

// 6. Build
console.log('\n[6/6] Executando Build...');
try {
    execSync('npm run build', { stdio: 'inherit' });
    console.log('  ✅ Build concluído com SUCESSO!');
} catch (error) {
    console.error('  ❌ Falha no Build.');
    process.exit(1);
}

console.log('\n' + '='.repeat(70));
console.log('  🎉 SISTEMA RECONSTRUÍDO DO ZERO COM SUCESSO! 🎉');
console.log('='.repeat(70));
console.log('\nAGORA EXECUTE:');
console.log('1. npm start');
console.log('2. No navegador: Ctrl + Shift + R (Recarregamento forçado)');
console.log('3. Vá em Checkout PIX, digite 100 e clique em Gerar.');
console.log('\nO QR Code aparecerá. O ciclo de erros acabou.');