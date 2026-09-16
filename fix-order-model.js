const fs = require('fs');

console.log('🔧 Corrigindo modelo Order...\n');

// 1. Verificar o schema atual
const schemaPath = 'prisma/schema.prisma';
let schema = fs.readFileSync(schemaPath, 'utf8');

console.log('Modelo Order atual:');
const orderModelMatch = schema.match(/model Order \{[\s\S]*?\n\}/);
if (orderModelMatch) {
    console.log(orderModelMatch[0]);
}

// 2. Corrigir: tornar totalValue opcional OU garantir que o código sempre o preencha
// Vamos tornar totalValue opcional para simplificar
schema = schema.replace(
    /totalValue\s+Float/,
    'totalValue Float?'
);

fs.writeFileSync(schemaPath, schema, 'utf8');
console.log('\n✅ Schema atualizado: totalValue agora é opcional');

// 3. Também corrigir o checkoutRoutes.ts para sempre preencher totalValue
const routesPath = 'src/routes/checkoutRoutes.ts';
let routes = fs.readFileSync(routesPath, 'utf8');

// Substituir a criação do order para incluir totalValue
routes = routes.replace(
    /data: \{ leadId, productId, amount, status: 'PENDING' \}/,
    "data: { leadId, productId, amount, totalValue: amount, status: 'PENDING' }"
);

fs.writeFileSync(routesPath, routes, 'utf8');
console.log('✅ checkoutRoutes.ts atualizado para preencher totalValue');

console.log('\n🎉 Correção concluída!');
console.log('Agora execute:');
console.log('1. npx prisma generate');
console.log('2. npm run build');
console.log('3. Ctrl+C (parar servidor) e npm start');