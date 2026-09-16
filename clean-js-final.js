const fs = require('fs');

console.log('🔧 Limpando DUPLICAÇÕES de forma agressiva...\n');

const jsPath = 'public/app-v3.js';
let js = fs.readFileSync(jsPath, 'utf8');

// 1. Remover QUALQUER linha que declare originalShowSection (com const, let ou var)
js = js.replace(/(?:const|let|var)\s+originalShowSection\s*=\s*showSection\s*;/g, '');
js = js.replace(/(?:const|let|var)\s+_originalShowSection\s*=\s*showSection\s*;/g, '');

// 2. Remover QUALQUER reatribuição antiga de showSection que adicionamos antes
// Isso remove blocos inteiros que começam com "showSection = function"
js = js.replace(/showSection\s*=\s*function\s*\([^)]*\)\s*\{[\s\S]*?^\}/gm, '');

// 3. Remover qualquer tentativa anterior de "OVERRIDE LIMPO" para evitar duplicação no final
js = js.replace(/\/\/ === OVERRIDE[\s\S]*$/, '');

// 4. Adicionar a versão limpa, segura e com nome de variável único no final do arquivo
const cleanOverride = `
// === OVERRIDE FINAL E ÚNICO DO SHOWSECTION ===
const _safeOriginalShowSection_v2 = showSection;
showSection = function(id) {
    // Chama a função original primeiro
    _safeOriginalShowSection_v2(id);
    
    // Lógica específica do Agendador
    if (id === 'scheduler' && typeof loadScheduler === 'function') {
        loadScheduler();
    }
    
    // Lógica específica do Checkout (limpar intervalo e esconder display)
    if (id === 'checkout') {
        const pixDisplay = document.getElementById('pix-display');
        if (pixDisplay) pixDisplay.style.display = 'none';
        
        if (typeof window.pixInterval !== 'undefined' && window.pixInterval) {
            clearInterval(window.pixInterval);
            window.pixInterval = null;
        }
    }
};
`;

js = js.trimEnd() + '\n' + cleanOverride;

// 5. Salvar o arquivo
fs.writeFileSync(jsPath, js, 'utf8');

console.log('✅ app-v3.js limpo agressivamente e corrigido!');
console.log('\nAGORA FAÇA:');
console.log('1. No navegador, pressione Ctrl + Shift + R (Recarregamento forçado)');
console.log('2. O erro vermelho deve ter sumido.');
console.log('3. Vá na aba "Checkout PIX" e teste o botão "Gerar PIX".');