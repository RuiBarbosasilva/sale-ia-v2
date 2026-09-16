const fs = require('fs');
const http = require('http');

console.log('🔍 Verificando e corrigindo rota de Checkout...\n');

// 1. Verificar se o arquivo de rotas existe
const routesPath = 'src/routes/checkoutRoutes.ts';
if (!fs.existsSync(routesPath)) {
    console.log('❌ Arquivo checkoutRoutes.ts NÃO existe!');
    process.exit(1);
}
console.log('✅ checkoutRoutes.ts existe');

// 2. Verificar se está registrado no apiRoutes.ts
const apiRoutesPath = 'src/routes/apiRoutes.ts';
let apiRoutes = fs.readFileSync(apiRoutesPath, 'utf8');

const hasImport = apiRoutes.includes("import checkoutRoutes from './checkoutRoutes'");
const hasUse = apiRoutes.includes("router.use('/checkout'");

console.log('\n Status do registro:');
console.log('  Import: ' + (hasImport ? '✅' : '❌'));
console.log('  Router.use: ' + (hasUse ? '✅' : '❌'));

if (!hasImport || !hasUse) {
    console.log('\n🔧 Corrigindo registro...');
    
    if (!hasImport) {
        apiRoutes = "import checkoutRoutes from './checkoutRoutes';\n" + apiRoutes;
    }
    if (!hasUse) {
        apiRoutes = apiRoutes.replace(
            'export default router;',
            "router.use('/checkout', checkoutRoutes);\n\nexport default router;"
        );
    }
    
    fs.writeFileSync(apiRoutesPath, apiRoutes, 'utf8');
    console.log('✅ Registro corrigido!');
} else {
    console.log('✅ Registro já está correto');
}

// 3. Testar a rota com POST real
console.log('\n Testando rota com POST real...');

const postData = JSON.stringify({ amount: 50.00 });

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/checkout/generate-pix',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
    }
};

const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        console.log('\n Resposta da API:');
        console.log('  Status: ' + res.statusCode);
        
        try {
            const json = JSON.parse(data);
            if (json.success) {
                console.log('  ✅ SUCESSO! PIX gerado corretamente');
                console.log('  Order ID: ' + json.order.id);
                console.log('  QR Code URL: ' + json.pix.qrCodeUrl.substring(0, 50) + '...');
            } else {
                console.log('  ⚠️ API respondeu com erro: ' + json.error);
            }
        } catch (e) {
            console.log('  ❌ Resposta inválida: ' + data.substring(0, 200));
        }
    });
});

req.on('error', (e) => {
    console.log(' Erro na conexão: ' + e.message);
});

req.write(postData);
req.end();