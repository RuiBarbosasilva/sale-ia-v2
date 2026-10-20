import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Criando dados de exemplo para Dropshipping Intelligence...');

  // Criar fornecedor de exemplo
  const supplier = await prisma.dropshipSupplier.create({
    data: {
      name: 'Fornecedor Exemplo - MPDROP',
      platform: 'MPDROP',
      site: 'https://mpdrop.com.br',
      contact: 'contato@mpdrop.com.br',
      reliabilityScore: 85,
      validationStatus: 'VALIDATED',
    },
  });

  console.log('✅ Fornecedor criado:', supplier.name);

  // Criar produto de exemplo
  const product = await prisma.dropshipProduct.create({
    data: {
      name: 'Organizador de Cabos Multiuso',
      sku: 'ORG-CAB-001',
      category: 'organizacao',
      supplierId: supplier.id,
      cost: 15.90,
      stock: 100,
      suggestedPrice: 39.90,
      margin: 60,
      opportunityScore: 88,
      riskScore: 15,
      classification: 'CHAMPION',
      status: 'CANDIDATE',
    },
  });

  console.log('✅ Produto criado:', product.name);

  // Criar alerta de exemplo
  await prisma.dropshipAlert.create({
    data: {
      type: 'CHAMPION_DETECTED',
      title: 'Produto Campeão Detectado',
      message: 'Organizador de Cabos Multiuso atingiu score 88 e está pronto para teste.',
      productId: product.id,
    },
  });

  console.log('✅ Alerta criado');
  console.log('🎉 Seed concluído!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.();
  });
