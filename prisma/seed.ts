import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const network = await prisma.affiliateNetwork.upsert({
    where: { name: 'Hotmart' },
    update: { active: true },
    create: {
      name: 'Hotmart',
      slug: 'hotmart',
      type: 'AFFILIATE_NETWORK',
      status: 'CONFIGURED',
      credentialStatus: 'NOT_CONFIGURED',
      active: true,
    },
  });

  const product = await prisma.affiliateProduct.upsert({
    where: {
      networkId_externalId: {
        networkId: network.id,
        externalId: 'seed-prod-1',
      },
    },
    update: {},
    create: {
      networkId: network.id,
      externalId: 'seed-prod-1',
      name: 'Curso Completo de Automação com IA',
      price: 497.9,
      commissionRate: 50,
      category: 'Tecnologia',
      opportunityScore: 8.5,
      status: 'DISCOVERED',
      affiliationStatus: 'NOT_AFFILIATED',
      affiliationMode: 'MANUAL',
    },
  });

  await prisma.affiliateProductScore.upsert({
    where: { id: 'seed-score-1' },
    update: {
      productId: product.id,
      score: 8.5,
      demand: 8,
      competition: 5,
      commission: 9,
      contentFit: 9,
      trend: 8,
      reasoning: 'Registro inicial para validação do módulo de Afiliados.',
    },
    create: {
      id: 'seed-score-1',
      productId: product.id,
      score: 8.5,
      demand: 8,
      competition: 5,
      commission: 9,
      contentFit: 9,
      trend: 8,
      reasoning: 'Registro inicial para validação do módulo de Afiliados.',
    },
  });

  const existingClient = await prisma.rbFactorySiteClient.findFirst({
    where: { companyName: 'Empresa Exemplo LTDA' },
  });

  if (!existingClient) {
    const prospect = await prisma.websiteProspect.create({
      data: {
        companyName: 'Empresa Exemplo LTDA',
        segment: 'Serviços Contábeis',
        websiteStatus: 'NO_WEBSITE',
        status: 'QUALIFIED',
        score: 78,
        websiteScore: 20,
        country: 'BR',
      },
    });

    await prisma.rbFactorySiteClient.create({
      data: {
        prospectId: prospect.id,
        companyName: prospect.companyName,
        status: 'ACTIVE',
        maintenancePlan: 'MONITORING',
      },
    });
  }

  console.log('Seed concluído com sucesso.');
}

main()
  .catch((error: unknown) => {
    console.error('Erro no seed:', error instanceof Error ? error.message : 'UNKNOWN_ERROR');
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
