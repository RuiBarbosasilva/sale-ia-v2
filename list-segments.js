const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const segments = await prisma.productSegment.findMany();
  
  console.log('\n=== SEGMENTOS CADASTRADOS ===\n');
  segments.forEach(s => {
    console.log('ID: ' + s.id);
    console.log('Nome: ' + s.name);
    console.log('Ícone: ' + (s.icon || 'N/A'));
    console.log('Descrição: ' + (s.description || 'N/A'));
    console.log('---');
  });
  
  console.log('\nTotal: ' + segments.length + ' segmento(s)');
  console.log('\nPara excluir o primeiro segmento, execute: node delete-segment.js ' + (segments[0] ? segments[0].id : 'ID'));
  
  await prisma.$disconnect();
})();