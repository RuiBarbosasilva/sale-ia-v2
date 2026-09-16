const fs = require('fs');
const https = require('https');

console.log('🔍 Diagnosticando problema do Checkout PIX...\n');

// 1. Verificar se o arquivo de rotas existe
console.log('[1/4] Verificando arquivo de rotas...');
const routesPath = 'src/routes/checkoutRoutes.ts';
if (fs.existsSync(routesPath)) {
    console.log('  ✅ checkoutRoutes.ts existe');
} else {
    console.log('  ❌ checkoutRoutes.ts NÃO existe! Criando...');
    
    const routesContent = `import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.post('/generate-pix', async (req: Request, res: Response) => {
  try {
    const { leadId, productId, amount } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Valor invalido' });

    const order = await prisma.order.create({
      data: { leadId, productId, amount, status: 'PENDING' }
    });

    const pixCode = '00020126580014BR.GOV.BCB.PIX0136' + order.id + '-sale-ia-v25204000053039865802BR5913SALE-IA-V26009SAO PAULO62070503***6304' + (Math.floor(Math.random() * 9000) + 1000);
    const qrCodeUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=' + encodeURIComponent(pixCode);

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 30);

    const pix = await prisma.pixPayment.create({
      data: { orderId: order.id, pixCode, qrCodeUrl, expiresAt }
    });

    return res.json({ success: true, order, pix });
  } catch (error: any) {
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

    fs.writeFileSync(routesPath, routesContent, 'utf8');
    console.log('  ✅ checkoutRoutes.ts criado');
}

// 2. Verificar se a rota está registrada
console.log('\n[2/4] Verificando registro da rota...');
const apiRoutesPath = 'src/routes/apiRoutes.ts';
let apiRoutes = fs.readFileSync(apiRoutesPath, 'utf8');

if (!apiRoutes.includes('checkoutRoutes')) {
    console.log('  ❌ Rota não registrada! Adicionando...');
    apiRoutes = "import checkoutRoutes from './checkoutRoutes';\n" + apiRoutes;
    apiRoutes = apiRoutes.replace('export default router;', "router.use('/checkout', checkoutRoutes);\n\nexport default router;");
    fs.writeFileSync(apiRoutesPath, apiRoutes, 'utf8');
    console.log('  ✅ Rota registrada');
} else {
    console.log('  ✅ Rota já está registrada');
}

// 3. Verificar se o JavaScript do frontend tem a função
console.log('\n[3/4] Verificando JavaScript do frontend...');
const jsPath = 'public/app-v3.js';
let js = fs.readFileSync(jsPath, 'utf8');

if (!js.includes('async function generatePix()')) {
    console.log('  ❌ Função generatePix não encontrada! Adicionando...');
    
    const checkoutJs = `
let currentOrderId = null;
let pixInterval = null;

async function generatePix() {
    const amount = parseFloat(document.getElementById('pix-amount').value);
    const productId = document.getElementById('pix-product-id').value.trim();
    
    if (!amount || amount <= 0) { alert('Informe um valor valido'); return; }
    
    try {
        const res = await fetch(API_BASE + '/checkout/generate-pix', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount, productId })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        
        currentOrderId = data.order.id;
        document.getElementById('pix-qr-img').src = data.pix.qrCodeUrl;
        document.getElementById('pix-code-text').textContent = data.pix.pixCode;
        document.getElementById('pix-display').style.display = 'block';
        document.getElementById('pix-status-text').textContent = 'Aguardando pagamento...';
        document.getElementById('pix-status-text').style.color = '#f59e0b';
        
        if (pixInterval) clearInterval(pixInterval);
        pixInterval = setInterval(checkPixStatus, 5000);
    } catch (err) {
        alert('Erro: ' + err.message);
    }
}

async function checkPixStatus() {
    if (!currentOrderId) return;
    try {
        const res = await fetch(API_BASE + '/checkout/pix/' + currentOrderId + '/status');
        const data = await res.json();
        if (data.status === 'PAID') {
            clearInterval(pixInterval);
            document.getElementById('pix-status-text').textContent = 'Pagamento Confirmado! ✅';
            document.getElementById('pix-status-text').style.color = '#10b981';
            alert('Pagamento confirmado com sucesso!');
        } else if (data.status === 'EXPIRED') {
            clearInterval(pixInterval);
            document.getElementById('pix-status-text').textContent = 'PIX Expirado';
            document.getElementById('pix-status-text').style.color = '#ef4444';
        }
    } catch (err) {
        console.error('Erro ao checar status:', err);
    }
}

function copyPixCode() {
    const code = document.getElementById('pix-code-text').textContent;
    navigator.clipboard.writeText(code).then(() => {
        alert('Código PIX copiado!');
    });
}

async function simulatePayment() {
    if (!currentOrderId) return;
    try {
        const res = await fetch(API_BASE + '/checkout/pix/' + currentOrderId + '/simulate-payment', { method: 'POST' });
        const data = await res.json();
        if (res.ok) {
            document.getElementById('pix-status-text').textContent = 'Pagamento Confirmado (Simulado)! ✅';
            document.getElementById('pix-status-text').style.color = '#10b981';
            clearInterval(pixInterval);
        }
    } catch (err) {
        alert('Erro: ' + err.message);
    }
}

const originalShow2 = showSection;
showSection = function(id) {
    originalShow2(id);
    if (id === 'checkout') {
        document.getElementById('pix-display').style.display = 'none';
        if (pixInterval) clearInterval(pixInterval);
    }
}
`;
    
    js += checkoutJs;
    fs.writeFileSync(jsPath, js, 'utf8');
    console.log('  ✅ Função generatePix adicionada');
} else {
    console.log('  ✅ Função generatePix já existe');
}

// 4. Testar a API diretamente
console.log('\n[4/4] Testando API diretamente...');
const testPayload = JSON.stringify({ amount: 100.00 });
const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/checkout/generate-pix',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(testPayload)
    }
};

const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (json.success) {
                console.log('  ✅ API funcionando! PIX gerado com sucesso');
                console.log('     Order ID:', json.order.id);
            } else {
                console.log('  ❌ API retornou erro:', json.error);
            }
        } catch (e) {
            console.log('  ❌ Erro ao testar API:', data.substring(0, 200));
            console.log('\n  💡 Dica: Reinicie o servidor (Ctrl+C e npm start)');
        }
    });
});

req.on('error', (e) => {
    console.log('  ❌ Servidor não está respondendo:', e.message);
    console.log('\n  💡 Dica: Execute npm start antes de testar');
});

req.write(testPayload);
req.end();

console.log('\n🎉 DIAGNÓSTICO CONCLUÍDO!');
console.log('\nPróximos passos:');
console.log('1. Se a API falhou, reinicie o servidor: Ctrl+C e depois npm start');
console.log('2. No navegador: Ctrl+Shift+R (recarregamento forçado)');
console.log('3. Tente gerar o PIX novamente');