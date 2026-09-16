const http = require('http');

console.log('Testando rotas do servidor (HTTP)...\n');

const endpoints = [
    '/api/dashboard/overview',
    '/api/segments',
    '/api/products',
    '/api/checkout/generate-pix'
];

endpoints.forEach(endpoint => {
    const options = {
        hostname: 'localhost',
        port: 3000,
        path: endpoint,
        method: 'GET'
    };
    
    const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            if (res.statusCode === 200) {
                console.log('✅ ' + endpoint + ' - OK');
            } else {
                console.log('⚠️ ' + endpoint + ' - Status: ' + res.statusCode);
            }
        });
    });
    
    req.on('error', (e) => {
        console.log('❌ ' + endpoint + ' - Erro: ' + e.message);
    });
    
    req.end();
});