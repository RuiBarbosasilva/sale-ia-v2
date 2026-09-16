import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seed() {
  console.log('>>> [SEED] Cadastrando produtos reais no banco de dados...');

  const caneca = await prisma.product.upsert({
    where: { name: 'Caneca Personalizada Porcelana' },
    update: {
      sku: 'CAN-PORC-325',
      category: 'Brindes',
      niche: 'CUSTOM_GIFTS',
      costPrice: 12.0,
      basePrice: 28.0,
      price: 28.0,
      minimumPrice: 20.0,
      active: true,
      stock: 500,
      description: 'Caneca de Porcelana Branca 325ml personalizada em sublimação.',
      customizationSpecs: {
        printArea: '20cm x 9.5cm',
        technique: 'Sublimação Full Color',
        productionTimeDays: 3
      }
    },
    create: {
      sku: 'CAN-PORC-325',
      name: 'Caneca Personalizada Porcelana',
      category: 'Brindes',
      niche: 'CUSTOM_GIFTS',
      costPrice: 12.0,
      basePrice: 28.0,
      price: 28.0,
      minimumPrice: 20.0,
      active: true,
      stock: 500,
      description: 'Caneca de Porcelana Branca 325ml personalizada em sublimação.',
      customizationSpecs: {
        printArea: '20cm x 9.5cm',
        technique: 'Sublimação Full Color',
        productionTimeDays: 3
      }
    }
  });

  // Alias/Produto genérico para resolver buscas rápidas por "caneca"
  await prisma.product.upsert({
    where: { name: 'caneca' },
    update: {
      sku: 'CAN-GENERIC',
      category: 'Brindes',
      costPrice: 12.0,
      basePrice: 28.0,
      price: 28.0,
      minimumPrice: 20.0,
      active: true,
      stock: 500
    },
    create: {
      sku: 'CAN-GENERIC',
      name: 'caneca',
      category: 'Brindes',
      costPrice: 12.0,
      basePrice: 28.0,
      price: 28.0,
      minimumPrice: 20.0,
      active: true,
      stock: 500
    }
  });

  console.log('✅ [SEED] Produtos cadastrados com sucesso:', caneca.name);
}

seed()
  .catch((e) => {
    console.error('❌ [SEED] Erro ao cadastrar produtos:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });