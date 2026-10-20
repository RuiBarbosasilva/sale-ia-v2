import { prisma } from '../../modules/mercadoLivre/lib/prisma';

export class DropshippingIntelligenceService {
  
  // ============================================================
  // CALCULADORA DE MARGEM
  // ============================================================
  calculateMargin(params: {
    salePrice: number;
    costPrice: number;
    marketplaceFeePercent: number;
    marketplaceFeeFixed?: number;
    shippingCost?: number;
    taxPercent?: number;
    packagingCost?: number;
    returnRatePercent?: number;
  }) {
    const {
      salePrice,
      costPrice,
      marketplaceFeePercent,
      marketplaceFeeFixed = 0,
      shippingCost = 0,
      taxPercent = 0,
      packagingCost = 0,
      returnRatePercent = 0
    } = params;

    const marketplaceFee = (salePrice * marketplaceFeePercent / 100) + marketplaceFeeFixed;
    const tax = salePrice * taxPercent / 100;
    const returnCost = salePrice * returnRatePercent / 100;
    
    const totalCosts = costPrice + marketplaceFee + shippingCost + tax + packagingCost + returnCost;
    const grossProfit = salePrice - costPrice;
    const netProfit = salePrice - totalCosts;
    const marginPercent = (netProfit / salePrice) * 100;
    const roi = (netProfit / totalCosts) * 100;
    const markup = ((salePrice - costPrice) / costPrice) * 100;
    const breakEvenPrice = totalCosts;

    return {
      salePrice,
      costPrice,
      marketplaceFee: Math.round(marketplaceFee * 100) / 100,
      shippingCost,
      tax: Math.round(tax * 100) / 100,
      packagingCost,
      returnCost: Math.round(returnCost * 100) / 100,
      totalCosts: Math.round(totalCosts * 100) / 100,
      grossProfit: Math.round(grossProfit * 100) / 100,
      netProfit: Math.round(netProfit * 100) / 100,
      marginPercent: Math.round(marginPercent * 100) / 100,
      roi: Math.round(roi * 100) / 100,
      markup: Math.round(markup * 100) / 100,
      breakEvenPrice: Math.round(breakEvenPrice * 100) / 100
    };
  }

  // ============================================================
  // SCORE DE OPORTUNIDADE DO PRODUTO
  // ============================================================
  calculateOpportunityScore(data: {
    demand?: number;
    competition?: number;
    margin?: number;
    supplierScore?: number;
    weight?: number;
    price?: number;
    stock?: number;
  }): { score: number; classification: string; details: any } {
    
    const weights = {
      demand: 0.20,
      competition: 0.15,
      margin: 0.25,
      supplierScore: 0.20,
      weight: 0.05,
      price: 0.10,
      stock: 0.05
    };

    const demandScore = Math.min(100, (data.demand || 50));
    const competitionScore = 100 - Math.min(100, (data.competition || 50));
    const marginScore = Math.min(100, ((data.margin || 0) * 2));
    const supplierScore = Math.min(100, (data.supplierScore || 0));
    const weightScore = data.weight ? Math.max(0, 100 - (data.weight * 10)) : 50;
    const priceScore = data.price ? Math.min(100, (data.price / 100) * 100) : 50;
    const stockScore = Math.min(100, (data.stock || 0));

    const totalScore = 
      (demandScore * weights.demand) +
      (competitionScore * weights.competition) +
      (marginScore * weights.margin) +
      (supplierScore * weights.supplierScore) +
      (weightScore * weights.weight) +
      (priceScore * weights.price) +
      (stockScore * weights.stock);

    let classification = 'REJECT';
    if (totalScore >= 85) classification = 'CHAMPION';
    else if (totalScore >= 75) classification = 'SCALE';
    else if (totalScore >= 60) classification = 'TEST';
    else if (totalScore >= 45) classification = 'WATCH';

    return {
      score: Math.round(totalScore * 100) / 100,
      classification,
      details: {
        demandScore: Math.round(demandScore),
        competitionScore: Math.round(competitionScore),
        marginScore: Math.round(marginScore),
        supplierScore: Math.round(supplierScore),
        weightScore: Math.round(weightScore),
        priceScore: Math.round(priceScore),
        stockScore: Math.round(stockScore)
      }
    };
  }

  // ============================================================
  // SCORE DE CONFIABILIDADE DO FORNECEDOR
  // ============================================================
  calculateSupplierReliabilityScore(data: {
    hasSite?: boolean;
    hasCatalog?: boolean;
    hasCNPJ?: boolean;
    hasShippingPolicy?: boolean;
    hasReturnPolicy?: boolean;
    emitsNF?: boolean;
    hasTracking?: boolean;
    hasStock?: boolean;
    shippingDays?: number;
    marketplaceCompatible?: boolean;
    allowsDropshipping?: boolean;
    hasGoodPackaging?: boolean;
    hasContact?: boolean;
    hasReputation?: boolean;
  }): { score: number; classification: string; reasons: string[] } {
    
    let score = 0;
    const reasons: string[] = [];

    if (data.hasSite) { score += 8; reasons.push('Site acessÃ­vel'); }
    if (data.hasCatalog) { score += 7; reasons.push('CatÃ¡logo acessÃ­vel'); }
    if (data.hasCNPJ) { score += 10; reasons.push('CNPJ disponÃ­vel'); }
    if (data.hasShippingPolicy) { score += 8; reasons.push('PolÃ­tica de envio clara'); }
    if (data.hasReturnPolicy) { score += 8; reasons.push('PolÃ­tica de devoluÃ§Ã£o'); }
    if (data.emitsNF) { score += 10; reasons.push('Emite NF'); }
    if (data.hasTracking) { score += 8; reasons.push('Rastreamento disponÃ­vel'); }
    if (data.hasStock) { score += 7; reasons.push('Estoque disponÃ­vel'); }
    if (data.shippingDays && data.shippingDays <= 2) { score += 8; reasons.push('Prazo de postagem rÃ¡pido'); }
    else if (data.shippingDays && data.shippingDays <= 5) { score += 5; }
    if (data.marketplaceCompatible) { score += 7; reasons.push('CompatÃ­vel com marketplace'); }
    if (data.allowsDropshipping) { score += 5; reasons.push('Permite dropshipping'); }
    if (data.hasGoodPackaging) { score += 4; reasons.push('Embalagem adequada'); }
    if (data.hasContact) { score += 5; reasons.push('Contato funcional'); }
    if (data.hasReputation) { score += 3; reasons.push('ReputaÃ§Ã£o verificada'); }

    let classification = 'NÃƒO RECOMENDADO';
    if (score >= 90) classification = 'EXCELENTE';
    else if (score >= 80) classification = 'CONFIÃVEL';
    else if (score >= 70) classification = 'ACEITÃVEL';
    else if (score >= 60) classification = 'RISCO';

    return {
      score: Math.min(100, score),
      classification,
      reasons
    };
  }

  // ============================================================
  // SCORE DE RISCO
  // ============================================================
  calculateRiskScore(data: {
    supplierScore?: number;
    stock?: number;
    shippingDays?: number;
    isFragile?: boolean;
    returnRate?: number;
    margin?: number;
    singleSupplier?: boolean;
  }): { score: number; level: string } {
    
    let risk = 0;

    if (data.supplierScore && data.supplierScore < 70) risk += 20;
    if (data.stock && data.stock < 10) risk += 15;
    if (data.shippingDays && data.shippingDays > 5) risk += 10;
    if (data.isFragile) risk += 20;
    if (data.returnRate && data.returnRate > 10) risk += 15;
    if (data.margin && data.margin < 15) risk += 10;
    if (data.singleSupplier) risk += 10;

    let level = 'BAIXO';
    if (risk >= 70) level = 'CRÃTICO';
    else if (risk >= 50) level = 'ALTO';
    else if (risk >= 30) level = 'MÃ‰DIO';

    return {
      score: Math.min(100, risk),
      level
    };
  }

  // ============================================================
  // SIMULADOR DE CENÃRIOS
  // ============================================================
  simulateScenarios(params: {
    salePrice: number;
    costPrice: number;
    marketplaceFeePercent: number;
    conservativeSales: number;
    baseSales: number;
    optimisticSales: number;
  }) {
    const { salePrice, costPrice, marketplaceFeePercent, conservativeSales, baseSales, optimisticSales } = params;

    const calculate = (sales: number) => {
      const revenue = salePrice * sales;
      const costs = costPrice * sales;
      const fees = revenue * marketplaceFeePercent / 100;
      const profit = revenue - costs - fees;
      const margin = (profit / revenue) * 100;
      const roi = (profit / costs) * 100;

      return {
        sales,
        revenue: Math.round(revenue * 100) / 100,
        costs: Math.round(costs * 100) / 100,
        fees: Math.round(fees * 100) / 100,
        profit: Math.round(profit * 100) / 100,
        margin: Math.round(margin * 100) / 100,
        roi: Math.round(roi * 100) / 100
      };
    };

    return {
      conservative: calculate(conservativeSales),
      base: calculate(baseSales),
      optimistic: calculate(optimisticSales)
    };
  }

  // ============================================================
  // CLASSIFICAÃ‡ÃƒO AUTOMÃTICA
  // ============================================================
  async classifyProduct(productId: string) {
    const product = await prisma.dropshipProduct.findUnique({
      where: { id: productId },
      include: { supplier: true }
    });

    if (!product) throw new Error('Produto nÃ£o encontrado');

    const opportunityScore = this.calculateOpportunityScore({
      demand: 70,
      competition: 40,
      margin: product.margin || 0,
      supplierScore: product.supplier.reliabilityScore,
      weight: product.weight || 0,
      price: product.suggestedPrice || 0,
      stock: product.stock
    });

    const riskScore = this.calculateRiskScore({
      supplierScore: product.supplier.reliabilityScore,
      stock: product.stock,
      shippingDays: product.supplier.shippingDays || undefined,
      isFragile: false,
      returnRate: 5,
      margin: product.margin || 0,
      singleSupplier: true
    });

    await prisma.dropshipProduct.update({
      where: { id: productId },
      data: {
        opportunityScore: opportunityScore.score,
        riskScore: riskScore.score,
        classification: opportunityScore.classification
      }
    });

    return {
      productId,
      opportunityScore,
      riskScore,
      classification: opportunityScore.classification
    };
  }

  // ============================================================
  // DASHBOARD DATA
  // ============================================================
  async getDashboardData() {
    const [
      totalProducts,
      totalSuppliers,
      validatedSuppliers,
      candidates,
      champions,
      scalable,
      totalOrders,
      totalRevenue,
      totalProfit
    ] = await Promise.all([
      prisma.dropshipProduct.count(),
      prisma.dropshipSupplier.count(),
      prisma.dropshipSupplier.count({ where: { validationStatus: 'VALIDATED' } }),
      prisma.dropshipProduct.count({ where: { status: 'CANDIDATE' } }),
      prisma.dropshipProduct.count({ where: { classification: 'CHAMPION' } }),
      prisma.dropshipProduct.count({ where: { classification: 'SCALE' } }),
      prisma.dropshipOrder.count(),
      prisma.dropshipOrder.aggregate({ _sum: { totalSale: true } }).then(r => r._sum.totalSale || 0),
      prisma.dropshipOrder.aggregate({ _sum: { profit: true } }).then(r => r._sum.profit || 0)
    ]);

    return {
      totalProducts,
      totalSuppliers,
      validatedSuppliers,
      candidates,
      champions,
      scalable,
      totalOrders,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalProfit: Math.round(totalProfit * 100) / 100,
      avgMargin: totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 10000) / 100 : 0
    };
  }

  // ============================================================
  // GERADOR DE ANÃšNCIO
  // ============================================================
  generateListing(product: any) {
    const title = `${product.name} - ${product.category || 'Produto'} | Qualidade Garantida`;
    
    const description = `
**${product.name}**

âœ… **CARACTERÃSTICAS PRINCIPAIS:**
â€¢ Produto de alta qualidade
â€¢ Material: ${product.material || 'Conforme especificaÃ§Ã£o'}
â€¢ Peso: ${product.weight ? product.weight + 'g' : 'Consultar'}
â€¢ DimensÃµes: ${product.dimensions || 'Consultar'}

 **CONTEÃšDO DA EMBALAGEM:**
â€¢ 1x ${product.name}
â€¢ Manual de instruÃ§Ãµes

ðŸšš **ENVIO:**
â€¢ Envio rÃ¡pido para todo o Brasil
â€¢ Produto com rastreamento
â€¢ Embalagem segura e discreta

ðŸ’¯ **GARANTIA:**
â€¢ SatisfaÃ§Ã£o garantida ou seu dinheiro de volta
â€¢ Suporte pÃ³s-venda dedicado

âš ï¸ **INFORMAÃ‡Ã•ES IMPORTANTES:**
â€¢ As cores podem variar ligeiramente devido Ã  configuraÃ§Ã£o do monitor
â€¢ Medidas podem ter variaÃ§Ã£o de atÃ© 2cm
    `.trim();

    const bullets = [
      'Produto de alta qualidade',
      'Envio rÃ¡pido com rastreamento',
      'Embalagem segura e discreta',
      'Suporte pÃ³s-venda dedicado',
      'SatisfaÃ§Ã£o garantida'
    ];

    const faq = [
      { q: 'Qual o prazo de entrega?', a: 'O prazo varia conforme sua regiÃ£o, mas geralmente entre 5-15 dias Ãºteis.' },
      { q: 'O produto tem garantia?', a: 'Sim, oferecemos garantia de satisfaÃ§Ã£o. Qualquer problema, entre em contato.' },
      { q: 'Como rastrear meu pedido?', a: 'ApÃ³s o envio, vocÃª receberÃ¡ o cÃ³digo de rastreamento por e-mail.' },
      { q: 'Posso devolver o produto?', a: 'Sim, vocÃª tem atÃ© 7 dias apÃ³s o recebimento para solicitar devoluÃ§Ã£o.' }
    ];

    return {
      title,
      description,
      bullets,
      faq,
      keywords: [product.name, product.category, 'qualidade', 'envio rÃ¡pido']
    };
  }
}

export const dropshippingIntelligenceService = new DropshippingIntelligenceService();