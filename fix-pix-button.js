const fs = require('fs');

console.log('🔧 Diagnosticando e corrigindo botão Gerar PIX...\n');

// 1. Verificar se a função existe no JavaScript
const jsPath = 'public/app-v3.js';
let js = fs.readFileSync(jsPath, 'utf8');

if (!js.includes('async function generatePix()')) {
    console.log('❌ Função generatePix() não encontrada no JavaScript');
    console.log('   Adicionando função completa...\n');
    
    const checkoutFunctions = `
let currentOrderId = null;
let pixInterval = null;

async function generatePix() {
    const amount = parseFloat(document.getElementById('pix-amount').value);
    const productId = document.getElementById('pix-product-id').value.trim();
    
    if (!amount || amount <= 0) { 
        alert('Informe um valor válido'); 
        return; 
    }
    
    try {
        console.log('Gerando PIX para valor:', amount);
        const res = await fetch(API_BASE + '/checkout/generate-pix', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount, productId })
        });
        
        console.log('Resposta da API:', res.status);
        const data = await res.json();
        
        if (!res.ok) {
            throw new Error(data.error || 'Erro ao gerar PIX');
        }
        
        currentOrderId = data.order.id;
        document.getElementById('pix-qr-img').src = data.pix.qrCodeUrl;
        document.getElementById('pix-code-text').textContent = data.pix.pixCode;
        document.getElementById('pix-display').style.display = 'block';
        document.getElementById('pix-status-text').textContent = 'Aguardando pagamento...';
        document.getElementById('pix-status-text').style.color = '#f59e0b';
        
        // Iniciar polling de status
        if (pixInterval) clearInterval(pixInterval);
        pixInterval = setInterval(checkPixStatus, 5000);
        
        console.log('✅ PIX gerado com sucesso! Order ID:', currentOrderId);
    } catch (err) {
        console.error('Erro ao gerar PIX:', err);
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
            document.getElementById('pix-status-text').textContent = 'PIX Expirado ❌';
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
    }).catch(err => {
        console.error('Erro ao copiar:', err);
        alert('Erro ao copiar código');
    });
}

async function simulatePayment() {
    if (!currentOrderId) {
        alert('Nenhum PIX gerado ainda');
        return;
    }
    try {
        const res = await fetch(API_BASE + '/checkout/pix/' + currentOrderId + '/simulate-payment', { 
            method: 'POST' 
        });
        const data = await res.json();
        
        if (res.ok) {
            document.getElementById('pix-status-text').textContent = 'Pagamento Confirmado (Simulado)! ✅';
            document.getElementById('pix-status-text').style.color = '#10b981';
            clearInterval(pixInterval);
            alert('Pagamento simulado com sucesso!');
        } else {
            throw new Error(data.error || 'Erro ao simular pagamento');
        }
    } catch (err) {
        alert('Erro: ' + err.message);
    }
}

// Garantir que showSection limpe o display de PIX
const originalShowSection = showSection;
showSection = function(id) {
    originalShowSection(id);
    if (id === 'checkout') {
        document.getElementById('pix-display').style.display = 'none';
        if (pixInterval) clearInterval(pixInterval);
    }
}
`;
    
    js += checkoutFunctions;
    fs.writeFileSync(jsPath, js, 'utf8');
    console.log('✅ Funções de checkout adicionadas ao JavaScript\n');
} else {
    console.log('✅ Função generatePix() já existe no JavaScript\n');
}

// 2. Verificar se as rotas de checkout estão registradas
const apiRoutesPath = 'src/routes/apiRoutes.ts';
let apiRoutes = fs.readFileSync(apiRoutesPath, 'utf8');

if (!apiRoutes.includes('checkoutRoutes')) {
    console.log(' Rota checkoutRoutes não registrada');
    console.log('   Adicionando rota...\n');
    
    apiRoutes = "import checkoutRoutes from './checkoutRoutes';\n" + apiRoutes;
    apiRoutes = apiRoutes.replace('export default router;', "router.use('/checkout', checkoutRoutes);\n\nexport default router;");
    fs.writeFileSync(apiRoutesPath, apiRoutes, 'utf8');
    console.log('✅ Rota de checkout registrada\n');
} else {
    console.log('✅ Rota checkoutRoutes já está registrada\n');
}

// 3. Verificar se o arquivo de rotas existe
const checkoutRoutesPath = 'src/routes/checkoutRoutes.ts';
if (!fs.existsSync(checkoutRoutesPath)) {
    console.log('❌ Arquivo checkoutRoutes.ts não encontrado');
    console.log('   Criando arquivo de rotas...\n');
    
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

    const pixCode = '00020126580014BR.GOV.BCB.PIX0136' + order.id + '-sale-ia-v25204000053039865802BR5913SALE-IA-V26009SAO PAULO62070503***6304' + Math.floor(Math.random() * 9000 + 1000);
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
    
    fs.writeFileSync(checkoutRoutesPath, routesContent, 'utf8');
    console.log('✅ Arquivo checkoutRoutes.ts criado\n');
} else {
    console.log('✅ Arquivo checkoutRoutes.ts já existe\n');
}

console.log('🎉 CORREÇÃO CONCLUÍDA!');
console.log('\nAgora execute:');
console.log('1. npm run build');
console.log('2. Ctrl+C (parar servidor) e depois npm start');
console.log('3. No navegador: Ctrl+Shift+R');
console.log('4. Vá na aba "Checkout PIX" e teste o botão "Gerar PIX"');