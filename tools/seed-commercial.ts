import { ensureDefaultCommercialProduct } from '../src/services/pricingService';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('[...] Executando seed de dados comerciais...');
  const prod = await ensureDefaultCommercialProduct();

  const sysConfig = await prisma.systemConfig.findFirst();
  if (!sysConfig) {
    await prisma.systemConfig.create({
      data: {
        companyName: 'Sale IA',
        minMargin: 0.15,
        defaultMarkup: 0.30,
        maxDiscountAllowed: 0.10
      }
    });
  }
  console.log('[OK] Produto comercial padrão e SystemConfig semeados:', prod.sku);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });