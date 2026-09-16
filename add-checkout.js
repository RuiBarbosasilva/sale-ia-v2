const fs = require('fs');

console.log('💳 Iniciando implementação do Checkout com PIX...\n');

// 1. ATUALIZAR SCHEMA PRISMA
console.log('[1/5] Atualizando schema.prisma...');
const schemaPath = 'prisma/schema.prisma';
let schema = fs.readFileSync(schemaPath, 'utf8');

const newModels = `

model Order {
  id        String   @id @default(uuid())
  leadId    String?
  productId String?
  amount    Float
  status    String   @default("PENDING")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  pix       PixPayment?
}

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
}`;

if (!schema.includes('model Order')) {
    schema += newModels;
    fs.writeFileSync(schemaPath, schema, 'utf8');
    console.log('  ✅ Modelos Order e PixPayment adicionados.');
} else {
    console.log('  ️ Modelos já existem.');
}

// 2. CRIAR ROTAS DE CHECKOUT
console.log('[2/5] Criando rotas de checkout...');
const routesContent = `
import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Gerar PIX (Simulação realista)
router.post('/generate-pix', async (req: Request, res: Response) => {
  try {
    const { leadId, productId, amount } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Valor invalido' });

    // 1. Criar o pedido
    const order = await prisma.order.create({
      data: { leadId, productId, amount, status: 'PENDING' }
    });

    // 2. Gerar código PIX "Copia e Cola" (Simulado, mas com formato real)
    const pixCode = \`00020126580014BR.GOV.BCB.PIX0136\${order.id}-sale-ia-v25204000053039865802BR5913SALE-IA-V26009SAO PAULO62070503***6304\${Math.floor(Math.random() * 9000) + 1000}\`;
    
    // 3. Gerar URL do QR Code (usando API pública gratuita)
    const qrCodeUrl = \`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=\${encodeURIComponent(pixCode)}\`;

    // 4. Calcular expiração (30 minutos)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 30);

    // 5. Salvar pagamento PIX
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

// Consultar status do PIX (Polling)
router.get('/pix/:orderId/status', async (req: Request, res: Response) => {
  try {
    const pix = await prisma.pixPayment.findUnique({
      where: { orderId: req.params.orderId },
      include: { order: true }
    });

    if (!pix) return res.status(404).json({ error: 'Pagamento nao encontrado' });

    // Simulação: Se o status ainda for PENDING e não expirou, mantém.
    // (Em produção, aqui entraria o Webhook do banco confirmando o pagamento)
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

// Simular confirmação de pagamento (Para testes)
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

export default router;
`;

fs.writeFileSync('src/routes/checkoutRoutes.ts', routesContent, 'utf8');
console.log('  ✅ checkoutRoutes.ts criado.');

// 3. REGISTRAR ROTA
console.log('[3/5] Registrando rota no apiRoutes.ts...');
const apiRoutesPath = 'src/routes/apiRoutes.ts';
let apiRoutes = fs.readFileSync(apiRoutesPath, 'utf8');

if (!apiRoutes.includes('checkoutRoutes')) {
    apiRoutes = "import checkoutRoutes from './checkoutRoutes';\n" + apiRoutes;
    apiRoutes = apiRoutes.replace('export default router;', "router.use('/checkout', checkoutRoutes);\n\nexport default router;");
    fs.writeFileSync(apiRoutesPath, apiRoutes, 'utf8');
    console.log('  ✅ Rota registrada.');
}

// 4. ATUALIZAR FRONTEND (HTML)
console.log('[4/5] Atualizando index.html...');
const htmlPath = 'public/index.html';
let html = fs.readFileSync(htmlPath, 'utf8');

const checkoutButton = '<button class="nav-btn" onclick="showSection(\'checkout\')">Checkout PIX</button>';
if (!html.includes("showSection('checkout')")) {
    const lastNav = html.lastIndexOf('</nav>');
    html = html.slice(0, lastNav) + '\n            ' + checkoutButton + '\n        ' + html.slice(lastNav);
}

const checkoutSection = `
        <!-- CHECKOUT PIX -->
        <section id="checkout" class="section">
            <h2>Checkout Automático com PIX</h2>
            
            <div class="form-grid" style="background: #ecfdf5; border: 1px solid #6ee7b7;">
                <h3 style="grid-column: 1 / -1;">Gerar Cobrança PIX</h3>
                <div class="input-group">
                    <label>Valor da Venda (R$)</label>
                    <input type="number" id="pix-amount" step="0.01" placeholder="0.00">
                </div>
                <div class="input-group">
                    <label>ID do Produto (Opcional)</label>
                    <input type="text" id="pix-product-id" placeholder="ID do produto">
                </div>
                <button class="action-btn" onclick="generatePix()" style="background: #10b981; grid-column: 1 / -1;">Gerar PIX</button>
            </div>

            <div id="pix-display" style="display: none; margin-top: 30px; padding: 30px; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-align: center; max-width: 500px; margin-left: auto; margin-right: auto;">
                <h3 style="color: #10b981; margin-bottom: 20px;">Pagamento via PIX Gerado!</h3>
                <p style="margin-bottom: 15px;">Escaneie o QR Code abaixo ou copie o código:</p>
                <img id="pix-qr-img" src="" alt="QR Code PIX" style="border: 1px solid #ddd; padding: 10px; border-radius: 8px; margin-bottom: 20px;">
                <div style="background: #f3f4f6; padding: 10px; border-radius: 6px; word-break: break-all; font-family: monospace; font-size: 12px; margin-bottom: 20px;" id="pix-code-text"></div>
                <button class="action-btn" onclick="copyPixCode()" style="background: #3b82f6; margin-bottom: 10px;">Copiar Código PIX</button>
                <br>
                <button class="action-btn" onclick="simulatePayment()" style="background: #f59e0b; font-size: 12px; padding: 8px 15px;">Simular Pagamento (Teste)</button>
                <p id="pix-status-text" style="margin-top: 15px; font-weight: bold; color: #f59e0b;">Aguardando pagamento...</p>
            </div>
        </section>
`;

if (!html.includes('id="checkout"')) {
    const lastMain = html.lastIndexOf('</main>');
    html = html.slice(0, lastMain) + checkoutSection + '\n    ' + html.slice(lastMain);
}
fs.writeFileSync(htmlPath, html, 'utf8');
console.log('  ✅ HTML atualizado.');

// 5. ATUALIZAR JAVASCRIPT
console.log('[5/5] Atualizando app-v3.js...');
const jsPath = 'public/app-v3.js';
let js = fs.readFileSync(jsPath, 'utf8');

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
        
        // Iniciar polling de status
        if (pixInterval) clearInterval(pixInterval);
        pixInterval = setInterval(checkPixStatus, 5000); // Checa a cada 5 segundos
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
            document.getElementById('pix-status-text').textContent = 'PIX Expirado ';
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

// Adicionar ao showSection
const originalShow2 = showSection;
showSection = function(id) {
    originalShow2(id);
    if (id === 'checkout') {
        document.getElementById('pix-display').style.display = 'none';
        if (pixInterval) clearInterval(pixInterval);
    }
}
`;

if (!js.includes('async function generatePix()')) {
    js += checkoutJs;
    fs.writeFileSync(jsPath, js, 'utf8');
    console.log('  ✅ JavaScript atualizado.');
}

console.log('\n🎉 IMPLEMENTAÇÃO DO CHECKOUT CONCLUÍDA!');
console.log('Agora execute os seguintes comandos no PowerShell:');
console.log('1. npx prisma migrate dev --name add_checkout');
console.log('2. npm run build');
console.log('3. Ctrl+C (para parar o servidor) e depois npm start');