import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

import { adminAuthorization } from '../middlewares/security';
const router = Router();
router.use(adminAuthorization);
const prisma = new PrismaClient();

// Dashboard financeiro por segmento (baseado em estoque e margem)
router.get('/by-segment', async (req: Request, res: Response) => {
  try {
    // Buscar todos os produtos ativos com seus segmentos
    const products = await prisma.product.findMany({
      where: { active: true },
      include: { segment: true }
    });

    // Agrupar métricas por segmento no JavaScript (mais seguro e flexível)
    const segmentMap = new Map();
    
    products.forEach(p => {
      const segId = p.segmentId || 'no-segment';
      const segName = p.segment?.name || 'Sem Segmento';
      const segIcon = p.segment?.icon || '📦';
      const segColor = p.segment?.color || '#6b7280';

      if (!segmentMap.has(segId)) {
        segmentMap.set(segId, {
          segmentId: segId,
          segmentName: segName,
          segmentIcon: segIcon,
          segmentColor: segColor,
          totalProducts: 0,
          totalStock: 0,
          totalRevenue: 0, // Valor de venda do estoque
          totalCost: 0     // Custo do estoque
        });
      }

      const seg = segmentMap.get(segId);
      seg.totalProducts += 1;
      seg.totalStock += p.stock;
      seg.totalRevenue += (p.salePrice * p.stock);
      seg.totalCost += (p.costPrice * p.stock);
    });

    const report = Array.from(segmentMap.values()).map(seg => {
      const profit = seg.totalRevenue - seg.totalCost;
      const margin = seg.totalRevenue > 0 ? ((profit / seg.totalRevenue) * 100) : 0;

      return {
        ...seg,
        totalRevenue: seg.totalRevenue.toFixed(2),
        totalCost: seg.totalCost.toFixed(2),
        profit: profit.toFixed(2),
        marginPercent: margin.toFixed(2)
      };
    });

    // Totais gerais do sistema
    const grandTotal = {
      totalSegments: report.length,
      totalProducts: products.length,
      totalRevenue: report.reduce((sum, r) => sum + parseFloat(r.totalRevenue), 0).toFixed(2),
      totalProfit: report.reduce((sum, r) => sum + parseFloat(r.profit), 0).toFixed(2),
      avgMargin: report.length > 0 
        ? (report.reduce((sum, r) => sum + parseFloat(r.marginPercent), 0) / report.length).toFixed(2) 
        : '0.00'
    };

    return res.json({ success: true, report, grandTotal });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Top produtos (ordenados por maior valor potencial em estoque)
router.get('/top-products', async (req: Request, res: Response) => {
  try {
    const topProducts = await prisma.product.findMany({
      where: { active: true },
      include: { segment: true },
      orderBy: { stock: 'desc' }, // Ordena por maior estoque
      take: 10
    });

    const ranking = topProducts.map((p, index) => ({
      rank: index + 1,
      name: p.name,
      segment: p.segment?.name || 'Geral',
      segmentIcon: p.segment?.icon || '📦',
      stock: p.stock,
      salePrice: p.salePrice,
      potentialRevenue: (p.salePrice * p.stock).toFixed(2)
    }));

    return res.json({ success: true, ranking });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;