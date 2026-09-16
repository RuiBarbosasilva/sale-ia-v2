const fs = require('fs');

console.log(' Adicionando botão Checkout PIX...\n');

const htmlPath = 'public/index.html';
let html = fs.readFileSync(htmlPath, 'utf8');

// 1. Adicionar botão no menu
const checkoutButton = '<button class="nav-btn" onclick="showSection(\'checkout\')">Checkout PIX</button>';

if (!html.includes("showSection('checkout')")) {
    const lastNavIndex = html.lastIndexOf('</nav>');
    if (lastNavIndex !== -1) {
        html = html.slice(0, lastNavIndex) + '\n            ' + checkoutButton + '\n        ' + html.slice(lastNavIndex);
        console.log('✅ Botão Checkout PIX adicionado ao menu');
    } else {
        console.log('❌ Tag </nav> não encontrada');
    }
} else {
    console.log('✅ Botão Checkout PIX já existe no menu');
}

// 2. Adicionar seção de checkout
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
    const lastMainIndex = html.lastIndexOf('</main>');
    if (lastMainIndex !== -1) {
        html = html.slice(0, lastMainIndex) + checkoutSection + '\n    ' + html.slice(lastMainIndex);
        console.log('✅ Seção Checkout PIX adicionada ao HTML');
    } else {
        console.log('❌ Tag </main> não encontrada');
    }
} else {
    console.log('✅ Seção Checkout PIX já existe no HTML');
}

fs.writeFileSync(htmlPath, html, 'utf8');

console.log('\n🎉 CONCLUÍDO!');
console.log('1. Reinicie o servidor (Ctrl+C e depois npm start)');
console.log('2. No navegador: Ctrl+Shift+R (recarregamento forçado)');
console.log('3. A aba "Checkout PIX" aparecerá no final do menu!');