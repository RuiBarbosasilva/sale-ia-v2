const fs = require('fs');
const { execSync } = require('child_process');

console.log(' Verificando e corrigindo modelos do Prisma...\n');

// 1. Verificar se PixPayment existe no schema
const schemaPath = 'prisma/schema.prisma';
let schema = fs.readFileSync(schemaPath, 'utf8');

console.log('[1/3] Verificando modelo PixPayment...');
if (!schema.includes('model PixPayment')) {
    console.log('  ❌ PixPayment NÃO encontrado! Adicionando...');
    schema += `

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
}
`;
    fs.writeFileSync(schemaPath, schema, 'utf8');
    console.log('  ✅ PixPayment adicionado ao schema');
} else {
    console.log('  ✅ PixPayment já existe no schema');
}

// 2. Verificar checkoutRoutes.ts
console.log('\n[2/3] Verificando checkoutRoutes.ts...');
const routesPath = 'src/routes/checkoutRoutes.ts';
let routes = fs.readFileSync(routesPath, 'utf8');

// Verificar se está usando prisma.pixPayment corretamente
if (!routes.includes('prisma.pixPayment')) {
    console.log('  ❌ Código não está usando prisma.pixPayment!');
    process.exit(1);
} else {
    console.log('  ✅ Código está correto');
}

// 3. Regenerar Prisma Client
console.log('\n[3/3] Regenerando Prisma Client...');
try {
    execSync('npx prisma generate', { stdio: 'inherit' });
    console.log('  ✅ Prisma Client gerado com sucesso!');
} catch (error) {
    console.error('  ❌ Erro ao gerar Prisma Client');
    process.exit(1);
}

console.log('\n' + '='.repeat(70));
console.log('  ✅ PRISMA CLIENT ATUALIZADO!');
console.log('='.repeat(70));
console.log('\nAgora execute:');
console.log('1. npm run build');
console.log('2. npm start');
console.log('3. No navegador: Ctrl + Shift + R e teste o Checkout PIX');