const fs = require('fs');

console.log('🔧 Limpando duplicações e erros de sintaxe no app-v3.js...\n');

const jsPath = 'public/app-v3.js';
let js = fs.readFileSync(jsPath, 'utf8');

// 1. Remover TODAS as versões antigas e duplicadas da sobrescrita do showSection
// Isso remove qualquer "const originalShow = showSection" ou variações que adicionamos antes
js = js.replace(/(?:const|let)\s+originalShow\d*\s*=\s*showSection;[\s\S]*?showSection\s*=\s*function\s*\([^)]*\)\s*\{[\s\S]*?\n\}\s*$/gm, '');
js = js.replace(/const _originalShowSection = showSection;[\s\S]*?showSection = function\(id\) \{[\s\S]*?\n\}\s*$/gm, '');

// 2. Adicionar APENAS UMA versão limpa e segura no final do arquivo
const cleanOverride = `
// === OVERRIDE LIMPO DO SHOWSECTION ===
const _originalShowSectionClean = showSection;
showSection = function(id) {
    _originalShowSectionClean(id);
    
    if (id === 'scheduler' && typeof loadScheduler === 'function') {
        loadScheduler();
    }
    
    if (id === 'checkout') {
        const pixDisplay = document.getElementById('pix-display');
        if (pixDisplay) pixDisplay.style.display = 'none';
        if (typeof pixInterval !== 'undefined' && pixInterval) {
            clearInterval(pixInterval);
            pixInterval = null;
        }
    }
};
`;

js = js.trimEnd() + '\n' + cleanOverride;

// 3. Salvar o arquivo corrigido
fs.writeFileSync(jsPath, js, 'utf8');

console.log('✅ app-v3.js limpo e corrigido com sucesso!');
console.log('\nPróximo passo:');
console.log('1. No navegador, pressione Ctrl + Shift + R (Recarregamento forçado)');
console.log('2. O dashboard deve carregar normalmente agora.');
console.log('3. Vá na aba "Checkout PIX" e teste o botão "Gerar PIX".');