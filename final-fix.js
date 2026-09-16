const fs = require('fs');

console.log(' Correção Final: Checkout + Logo + Favicon\n');

// 1. CORRIGIR CHECKOUT - Gerar email único com timestamp
console.log('[1/3] Corrigindo checkoutRoutes.ts (email único)...');
const routesPath = 'src/routes/checkoutRoutes.ts';
let routes = fs.readFileSync(routesPath, 'utf8');

// Substituir email fixo por email único com timestamp
routes = routes.replace(
    /email:\s*['"]walkin@sale-ia\.local['"]/g,
    "email: 'walkin-' + Date.now() + '@sale-ia.local'"
);

// Garantir que o phone também seja único
routes = routes.replace(
    /phone:\s*['"]0{9,}['"]/g,
    "phone: String(Date.now()).slice(-10)"
);

fs.writeFileSync(routesPath, routes, 'utf8');
console.log('  ✅ Email e Phone agora são únicos (com timestamp)');

// 2. CONFIGURAR FAVICON NO HTML
console.log('\n[2/3] Configurando favicon no index.html...');
const htmlPath = 'public/index.html';
let html = fs.readFileSync(htmlPath, 'utf8');

// Adicionar favicon se não existir
if (!html.includes('<link rel="icon"')) {
    const faviconLink = '<link rel="icon" type="image/png" href="/favicon.png">';
    html = html.replace('<head>', '<head>\n    ' + faviconLink);
    fs.writeFileSync(htmlPath, html, 'utf8');
    console.log('  ✅ Favicon configurado');
} else {
    console.log('  ℹ️ Favicon já configurado');
}

// 3. ADICIONAR LOGO NO HEADER
console.log('\n[3/3] Adicionando logo no header...');
if (!html.includes('SALE-IA-V2') || !html.includes('<img')) {
    // Procurar o título "SALE-IA-V2" e adicionar logo antes
    const logoHTML = `<img src="/logo.png" alt="SALE-IA-V2" style="height: 50px; margin-right: 15px; vertical-align: middle;">`;
    
    // Tentar inserir após a div do título
    if (html.includes('SALE-IA-V2</h1>')) {
        html = html.replace('SALE-IA-V2</h1>', logoHTML + 'SALE-IA-V2</h1>');
    } else if (html.includes('<h1>SALE-IA-V2</h1>')) {
        html = html.replace('<h1>SALE-IA-V2</h1>', '<h1>' + logoHTML + 'SALE-IA-V2</h1>');
    } else if (html.includes('SALE-IA-V2')) {
        // Inserir no início do body ou header
        html = html.replace('<body>', '<body>\n    <div style="display:flex;align-items:center;margin-bottom:20px;">' + logoHTML + '<h1 style="margin:0;">SALE-IA-V2</h1></div>');
    }
    
    fs.writeFileSync(htmlPath, html, 'utf8');
    console.log('  ✅ Logo adicionada ao header');
} else {
    console.log('  ℹ️ Logo já existe ou estrutura diferente');
}

console.log('\n' + '='.repeat(70));
console.log('  ✅ CORREÇÃO FINAL APLICADA!');
console.log('='.repeat(70));
console.log('\nAgora execute:');
console.log('1. npm run build');
console.log('2. npm start');
console.log('3. No navegador: Ctrl + Shift + R');
console.log('4. Vá em Checkout PIX e teste!');
console.log('\nO erro de email duplicado NUNCA MAIS vai acontecer!');