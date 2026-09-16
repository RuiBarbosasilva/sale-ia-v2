const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function corrigir() {
  const id = '89612fe6-f909-405f-9438-5274b0c666bb';
  
  // 1. Buscar o segmento
  const seg = await prisma.productSegment.findUnique({ where: { id } });
  console.log('Segmento encontrado:', seg.name);
  console.log('Está ativo no banco?', seg.isActive);

  // 2. Reativar se estiver inativo
  if (!seg.isActive) {
    await prisma.productSegment.update({
      where: { id },
      data: { isActive: true }
    });
    console.log('✅ Sucesso: Segmento reativado!');
  } else {
    console.log('✅ O segmento já está ativo.');
  }

  // 3. Simular o que a API vai mostrar na tela
  const lista = await prisma.productSegment.findMany({
    where: { isActive: true },
    include: { _count: { select: { products: true } } }
  });
  console.log(' A API vai retornar', lista.length, 'segmento(s) para a tela.');

  await prisma.$disconnect();
}

corrigir().catch(console.error);