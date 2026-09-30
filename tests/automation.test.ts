import { PrismaClient } from "@prisma/client";
import { automationService } from "../src/services/automationService";
import { evolutionService } from "../src/services/evolutionService";

const prisma = new PrismaClient();

describe("AutomationService - Resposta Autom?tica no WhatsApp", () => {
  beforeAll(async () => {
    await prisma.product.upsert({
      where: {
        id: "test-automation-product"
      },
      update: {
        salePrice: 50,
        costPrice: 10,
        active: true,
        stock: 500
      },
      create: {
        id: "test-automation-product",
        name: "Camisa Polo Personalizada Teste",
        description: "Produto utilizado nos testes automatizados",
        niche: "Vestu?rio",
        salePrice: 50,
        costPrice: 10,
        active: true,
        stock: 500
      }
    });
  });

  afterAll(async () => {
    await prisma.quote.deleteMany({
      where: {
        productId: "test-automation-product"
      }
    });

    await prisma.product.deleteMany({
      where: {
        id: "test-automation-product"
      }
    });

    await prisma.$disconnect();
  });

  it("deve processar lead e disparar mensagem via Evolution API", async () => {
    jest
      .spyOn(evolutionService, "sendTextMessage")
      .mockResolvedValue(true);

    const result =
      await automationService.processAndRespondLead({
        leadPhone: "5535999999999",
        leadName: "Rui",
        productName: "Camisa Polo Personalizada Teste",
        quantity: 10,
        requestedDiscountPct: 10
      });

    expect(result.success).toBe(true);
    expect(result.finalUnitPrice).toBe(45);
    expect(result.finalTotal).toBe(450);
    expect(result.messageSent).toBe(true);

    expect(
      evolutionService.sendTextMessage
    ).toHaveBeenCalledTimes(1);
  });
});
