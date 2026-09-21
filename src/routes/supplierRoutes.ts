import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { marginAnalysisService } from '../services/marginAnalysisService';
import { adminAuthorization } from '../middlewares/security';

const router = Router();
const prisma = new PrismaClient();

// Listar fornecedores
router.get('/', adminAuthorization, async (req: Request, res: Response) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });
    return res.json({ success: true, suppliers });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Cadastrar fornecedor
router.post('/', adminAuthorization, async (req: Request, res: Response) => {
  try {
    const { name, contactName, phone, email, website } = req.body;
    const supplier = await prisma.supplier.create({ data: { name, contactName, phone, email, website } });
    return res.json({ success: true, supplier });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Vincular produto a fornecedor com preço de custo
router.post('/product-link', adminAuthorization, async (req: Request, res: Response) => {
  try {
    const { supplierId, productId, costPrice, minQuantity, leadTimeDays } = req.body;
    
    const sp = await prisma.supplierProduct.create({
      data: { supplierId, productId, costPrice, minQuantity, leadTimeDays },
      include: { supplier: true }
    });

    // Recalcular margens
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (product) {
      await marginAnalysisService.analyzeProduct(productId, product.salePrice);
    }

    return res.json({ success: true, sp });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Gerar relatório de sugestão de compra
router.get('/purchase-report', adminAuthorization, async (req: Request, res: Response) => {
  try {
    const targetSales = parseFloat(req.query.target as string) || 10000; // Meta padrão de R$ 10.000
    const report = await marginAnalysisService.generatePurchaseReport(targetSales);
    return res.json({ success: true, targetSales, report });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;