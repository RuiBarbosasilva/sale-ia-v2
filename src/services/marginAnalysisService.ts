import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class MarginAnalysisService {
  
  // Calcula a margem e atualiza o fornecedor preferido
  async analyzeProduct(productId: string, salePrice: number) {
    const supplierProducts = await prisma.supplierProduct.findMany({
      where: { productId },
      include: { supplier: true }
    });

    if (supplierProducts.length === 0) {
      return { message: 'Nenhum fornecedor cadastrado para este produto' };
    }

    let bestSupplier = null;
    let highestMargin = -1;

    const analysis = supplierProducts.map(sp => {
      const marginValue = salePrice - sp.costPrice;
      const marginPercent = salePrice > 0 ? (marginValue / salePrice) * 100 : 0;
      const isBest = marginPercent > highestMargin;

      if (isBest) {
        highestMargin = marginPercent;
        bestSupplier = sp;
      }

      return {
        supplierName: sp.supplier.name,
        costPrice: sp.costPrice,
        marginValue: marginValue.toFixed(2),
        marginPercent: marginPercent.toFixed(2),
        leadTimeDays: sp.leadTimeDays,
        isPreferred: isBest
      };
    });

    // Atualizar o flag de preferido no banco
    await prisma.supplierProduct.updateMany({
      where: { productId },
      data: { isPreferred: false }
    });
    
    if (bestSupplier) {
      await prisma.supplierProduct.update({
        where: { id: bestSupplier.id },
        data: { isPreferred: true }
      });
    }

    return {
      productId,
      salePrice,
      bestSupplier: bestSupplier ? {
        name: bestSupplier.supplier.name,
        costPrice: bestSupplier.costPrice,
        marginPercent: highestMargin.toFixed(2)
      } : null,
      allOptions: analysis
    };
  }

  // Gera relatório de sugestão de compra baseado em meta
  async generatePurchaseReport(targetSales: number) {
    // Lógica simplificada: busca produtos com maior margem e menor estoque (simulado)
    // Em produção, cruzaria com a tabela de estoque real
    const products = await prisma.product.findMany({
      where: { active: true },
      include: {
        supplierProducts: {
          where: { isPreferred: true },
          include: { supplier: true }
        }
      }
    });

    const report = products.map(p => {
      const preferred = p.supplierProducts[0];
      const margin = p.salePrice > 0 ? ((p.salePrice - (preferred?.costPrice || 0)) / p.salePrice) * 100 : 0;
      
      // Simulação de sugestão: se a margem for > 30%, sugere comprar para atingir a meta
      const suggestedBuy = margin > 30 ? Math.ceil(targetSales / p.salePrice) : 0;

      return {
        productName: p.name,
        currentSalePrice: p.salePrice,
        bestCostPrice: preferred?.costPrice || 0,
        marginPercent: margin.toFixed(2),
        supplierName: preferred?.supplier.name || 'Nenhum',
        suggestedQuantityToBuy: suggestedBuy,
        estimatedInvestment: suggestedBuy > 0 ? (suggestedBuy * (preferred?.costPrice || 0)).toFixed(2) : '0.00'
      };
    }).filter(r => r.suggestedQuantityToBuy > 0);

    return report;
  }
}

export const marginAnalysisService = new MarginAnalysisService();