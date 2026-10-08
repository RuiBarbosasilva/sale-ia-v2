import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  // 1. Criar Rede de Afiliados
  const network = await prisma.affiliateNetwork.upsert({
    where: { name: 'Hotmart' },
    update: {},
    create: {
      name: 'Hotmart',
      apiKey: 'seed-api-key-hotmart',
      isActive: true,
    },
  });
  console.log('✅ Rede de afiliados criada:', network.name);

  // 2. Criar Produtos de Afiliados com Score
  const prod1 = await prisma.affiliateProduct.upsert({
    where: { externalId: 'seed-prod-1' },
    update: {},
    create: {
      externalId: 'seed-prod-1',
      networkId: network.id,
      name: 'Curso Completo de Automação com IA',
      price: 497.90,
      commission: 50.0,
      niche: 'Tecnologia',
    },
  });
  
  await prisma.affiliateProductScore.upsert({
    where: { productId: prod1.id },
    update: {},
    create: {
      productId: prod1.id,
      score: 8.5,
      demandLevel: 'ALTA',
      competitionLevel: 'MEDIA',
    },
  });
  console.log('✅ Produto e Score criados:', prod1.name);

  // 3. Criar Cliente RB Factory
  const client = await prisma.rbFactorySiteClient.upsert({
    where: { email: 'contato@exemplo.com' },
    update: {},
    create: {
      name: 'Empresa Exemplo LTDA',
      email: 'contato@exemplo.com',
      niche: 'Serviços Contábeis',
      status: 'PROSPECTED',
      score: 7.8,
      hasWebsite: false,
    },
  });
  console.log('✅ Cliente RB Factory criado:', client.name);

  console.log('🎉 Seed concluído com sucesso!');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.\();
  });
