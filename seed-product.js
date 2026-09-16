const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const product = await prisma.product.upsert({
    where: { name: "caneca" },
    update: {
      costPrice: 10.00,       // <-- Custo informado pelo proprietário
      basePrice: 20.00,       // <-- Preço base informado pelo proprietário
      minimumPrice: 15.00,    // <-- Preço mínimo informado pelo proprietário
      minimumMarginPct: 33.3, // <-- Margem mínima
      active: true
    },
    create: {
      name: "caneca",
      description: "Caneca personalizada",
      category: "Brindes",
      costPrice: 10.00,       // <-- Custo informado pelo proprietário
      basePrice: 20.00,       // <-- Preço base informado pelo proprietário
      minimumPrice: 15.00,    // <-- Preço mínimo informado pelo proprietário
      minimumMarginPct: 33.3, // <-- Margem mínima
      active: true
    }
  });
  console.log("PRODUTO CADASTRADO COM SUCESSO:", product);
}

main()
  .catch((e) => {
    console.error("ERRO:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
