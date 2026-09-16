const fs = require('fs');

console.log('🧹 Limpando código do Checkout (Removendo campo inválido)...\n');

const routesPath = 'src/routes/checkoutRoutes.ts';
let routes = fs.readFileSync(routesPath, 'utf8');

// Remover a linha source: 'CHECKOUT_PIX' que está causando o erro
// Isso deixa o código limpo e compatível com o schema real
routes = routes.replace(/,\s*source:\s*['"]CHECKOUT_PIX['"]/, '');

fs.writeFileSync(routesPath, routes, 'utf8');

console.log('✅ Código limpo! Campo "source" removido de checkoutRoutes.ts');
console.log('\nAgora execute:');
console.log('1. npm run build');
console.log('2. npm start');
console.log('3. No navegador: Ctrl + Shift + R e teste o Checkout.');