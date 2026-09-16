import fs from "fs";
import path from "path";

const ROOT = process.cwd();

function write(file: string, content: string) {
  const full = path.join(ROOT, file);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, "utf8");
  console.log(`[OK] ${file}`);
}

/* ============================================================
   1. PRICING SERVICE
   ============================================================ */

write("src/services/pricingService.ts", `
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface PricingCalculationResult {
  productId: string;
  productName: string;
  quantity: number;
  costPrice: number;
  unitPrice: number;
  totalPrice: number;
  minimumPrice: number;
  minimumMarginPct: number;
  appliedDiscountPct: number;
  requiresHumanEscalation: boolean;
  quoteId?: string;
  leadId?: string;
}

function normalizeProductName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\\\\u0300-\\\\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export async function calculateQuote(
  productName: string,
  quantity: number,
  leadId?: string
): Promise<PricingCalculationResult> {

  if (!productName) {
    throw new Error("Produto não informado.");
  }

  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error("Quantidade inválida.");
  }

  const normalized = normalizeProductName(productName);

  const products = await prisma.product.findMany({
    where: {
      active: true
    }
  });

  const product = products.find(
    p => normalizeProductName(p.name).includes(normalized) ||
         normalized.includes(normalizeProductName(p.name))
  );

  if (!product) {
    throw new Error(
      \`Produto "\${productName}" não cadastrado no catálogo comercial.\`
    );
  }

  const unitPrice = product.basePrice;
  const totalPrice = Number((unitPrice * quantity).toFixed(2));

  let quoteId: string | undefined;

  if (leadId) {
    const quote = await prisma.quote.create({
      data: {
        leadId,
        productId: product.id,
        product: product.name,
        quantity,
        unitPrice,
        totalPrice,
        appliedDiscountPct: 0,
        requiresHumanEscalation: false,
        status: "OPEN"
      }
    });

    quoteId = quote.id;
  }

  return {
    productId: product.id,
    productName: product.name,
    quantity,
    costPrice: product.costPrice,
    unitPrice,
    totalPrice,
    minimumPrice: product.minimumPrice,
    minimumMarginPct: product.minimumMarginPct,
    appliedDiscountPct: 0,
    requiresHumanEscalation: false,
    quoteId,
    leadId
  };
}

export async function negotiateQuote(
  leadId: string,
  discountPct: number
) {
  const quote = await prisma.quote.findFirst({
    where: {
      leadId,
      status: "OPEN"
    },
    orderBy: {
      createdAt: "desc"
    },
    include: {
      productRef: true
    }
  });

  if (!quote) {
    throw new Error(
      "Não há cotação aberta vinculada a este lead."
    );
  }

  const requestedDiscount = Math.max(0, discountPct);

  const minimumAllowed =
    quote.productRef.minimumPrice;

  const originalTotal = quote.unitPrice * quote.quantity;

  const discountedUnitPrice =
    quote.unitPrice * (1 - requestedDiscount / 100);

  const discountedTotal =
    discountedUnitPrice * quote.quantity;

  if (discountedUnitPrice < minimumAllowed) {
    return {
      allowed: false,
      requiresHuman: true,
      reason:
        "O desconto solicitado ultrapassa o preço mínimo comercial permitido.",
      quoteId: quote.id,
      originalTotal: Number(originalTotal.toFixed(2)),
      proposedTotal: Number(discountedTotal.toFixed(2)),
      minimumPrice: minimumAllowed
    };
  }

  const updated = await prisma.quote.update({
    where: {
      id: quote.id
    },
    data: {
      unitPrice: Number(discountedUnitPrice.toFixed(2)),
      totalPrice: Number(discountedTotal.toFixed(2)),
      appliedDiscountPct: requestedDiscount,
      requiresHumanEscalation: false
    }
  });

  return {
    allowed: true,
    requiresHuman: false,
    quoteId: updated.id,
    originalTotal: Number(originalTotal.toFixed(2)),
    finalTotal: updated.totalPrice,
    discountPct: requestedDiscount
  };
}

export async function getLatestQuote(leadId: string) {
  return prisma.quote.findFirst({
    where: {
      leadId
    },
    orderBy: {
      createdAt: "desc"
    },
    include: {
      productRef: true
    }
  });
}
`);

/* ============================================================
   2. PRICING ROUTE
   ============================================================ */

write("src/routes/pricing.ts", `
import { Router, Request, Response } from "express";
import {
  calculateQuote,
  negotiateQuote,
  getLatestQuote
} from "../services/pricingService";

const router = Router();

router.post("/quote", async (req: Request, res: Response) => {
  try {
    const {
      productName,
      product,
      quantity,
      leadId
    } = req.body;

    const name = productName || product;

    const result = await calculateQuote(
      name,
      Number(quantity),
      leadId
    );

    return res.json({
      success: true,
      result
    });

  } catch (error) {
    return res.status(400).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erro ao calcular orçamento."
    });
  }
});

router.post("/negotiate", async (req: Request, res: Response) => {
  try {
    const {
      leadId,
      discountPct = 5
    } = req.body;

    if (!leadId) {
      return res.status(400).json({
        success: false,
        error: "leadId é obrigatório para negociação."
      });
    }

    const result = await negotiateQuote(
      leadId,
      Number(discountPct)
    );

    return res.json({
      success: true,
      result
    });

  } catch (error) {
    return res.status(400).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erro na negociação."
    });
  }
});

router.get("/quote/:leadId", async (req: Request, res: Response) => {
  try {
    const result = await getLatestQuote(req.params.leadId);

    return res.json({
      success: true,
      result
    });

  } catch (error) {
    return res.status(400).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erro ao consultar cotação."
    });
  }
});

export { router as pricingRoutes };
export default router;
`);

/* ============================================================
   3. GARANTE IMPORT CORRETO NO SERVER
   ============================================================ */

const serverPath = path.join(ROOT, "src/server.ts");

if (fs.existsSync(serverPath)) {
  let server = fs.readFileSync(serverPath, "utf8");

  server = server.replace(
    /import\s+\{\s*pricingRoutes\s*\}\s+from\s+["']\.\/routes\/pricing["'];?/g,
    'import { pricingRoutes } from "./routes/pricing";'
  );

  fs.writeFileSync(serverPath, server, "utf8");

  console.log("[OK] src/server.ts");
}

/* ============================================================
   4. SEED COMERCIAL
   ============================================================ */

write("prisma/seed-commercial.ts", `
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {

  const product = await prisma.product.upsert({
    where: {
      name: "Caneca Personalizada"
    },
    update: {
      active: true,
      costPrice: 6.50,
      basePrice: 12.50,
      minimumPrice: 10.50,
      minimumMarginPct: 40
    },
    create: {
      name: "Caneca Personalizada",
      description: "Caneca personalizada para brindes e presentes.",
      category: "BRINDES",
      active: true,
      costPrice: 6.50,
      basePrice: 12.50,
      minimumPrice: 10.50,
      minimumMarginPct: 40
    }
  });

  console.log("");
  console.log("==================================================");
  console.log(" PRODUTO COMERCIAL");
  console.log("==================================================");
  console.log(product);
  console.log("==================================================");
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
`);

/* ============================================================
   5. TESTE COMERCIAL
   ============================================================ */

write("tests/commercial.test.ts", `
import { PrismaClient } from "@prisma/client";
import {
  calculateQuote,
  negotiateQuote
} from "../src/services/pricingService";

const prisma = new PrismaClient();

async function main() {

  console.log("");
  console.log("==================================================");
  console.log(" SALE-IA-V2 — TESTE COMERCIAL");
  console.log("==================================================");

  const lead = await prisma.lead.create({
    data: {
      name: "Cliente Teste",
      phone: "35999999999",
      stage: "LEAD_NOVO",
      status: "ACTIVE"
    }
  });

  console.log("");
  console.log("[1] LEAD");
  console.log(lead.id);

  const quote = await calculateQuote(
    "Caneca Personalizada",
    100,
    lead.id
  );

  console.log("");
  console.log("[2] ORÇAMENTO");
  console.log(JSON.stringify(quote, null, 2));

  if (quote.totalPrice !== 1250) {
    throw new Error(
      "Valor esperado para 100 canecas: R$ 1.250,00"
    );
  }

  const negotiation = await negotiateQuote(
    lead.id,
    5
  );

  console.log("");
  console.log("[3] NEGOCIAÇÃO 5%");
  console.log(JSON.stringify(negotiation, null, 2));

  if (!negotiation.allowed) {
    throw new Error(
      "Negociação de 5% deveria ser permitida."
    );
  }

  console.log("");
  console.log("==================================================");
  console.log(" TESTE COMERCIAL: OK");
  console.log("==================================================");

}

main()
  .catch(error => {
    console.error("");
    console.error("TESTE COMERCIAL: ERRO");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
`);

console.log("");
console.log("============================================================");
console.log(" CORREÇÃO DE ARQUITETURA APLICADA");
console.log("============================================================");
