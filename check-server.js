const https = require('https');

console.log('Testando rotas críticas do servidor...\n');

const endpoints = [
    '/api/dashboard/overview',
    '/api/segments',
    '/api/products'
];

endpoints.forEach(endpoint => {
    const options = {
        hostname: 'localhost',
        port: 3000,
        path: endpoint,
        method: 'GET',
        rejectUnauthorized: false
    };
    
    const req = https.request(options, (res) => {
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