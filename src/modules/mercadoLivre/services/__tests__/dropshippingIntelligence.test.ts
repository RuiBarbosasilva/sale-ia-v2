import { calculateMargin, scoreProduct, scoreSupplier } from '../dropshippingIntelligence';

describe('Dropshipping Intelligence decision engine', () => {
  test('rejects supplier with no legal identity, invoice, or passed sample order', () => {
    const result = scoreSupplier({
      hasCnpjOrLegalIdentity: false, hasPublicContact: true,
      hasWrittenDropshippingPolicy: true, confirmsStockSync: true,
      providesInvoice: false, providesTracking: true,
      hasClearReturnPolicy: true, hasVerifiableReputation: true,
      sampleOrderPassed: false,
    });
    expect(result.status).toBe('REJECTED');
    expect(result.score).toBeLessThan(100);
    expect(result.blockers.length).toBeGreaterThan(0);
  });

  test('calculates positive unit profit and break-even price', () => {
    const result = calculateMargin({
      salePrice: 79.9, supplierCost: 25, marketplaceFeeRatePct: 16,
      fixedMarketplaceFee: 6, shippingCost: 0, taxRatePct: 4,
      packagingCost: 0, returnReserveRatePct: 2,
    });
    expect(result.valid).toBe(true);
    expect(result.estimatedProfit).toBeGreaterThan(0);
    expect(result.breakEvenPrice).toBeLessThan(79.9);
  });

  test('rejects invalid economics and does not produce NaN', () => {
    const result = calculateMargin({
      salePrice: -1, supplierCost: 20, marketplaceFeeRatePct: 15,
      fixedMarketplaceFee: 0, shippingCost: 0, taxRatePct: 4,
    });
    expect(result.valid).toBe(false);
    expect(Number.isNaN(result.estimatedProfit)).toBe(false);
  });

  test('does not label a product champion without observed evidence', () => {
    const result = scoreProduct({
      demandScore: 95, competitionScore: 20, supplierReliabilityScore: 95,
      marginPct: 35, listingQualityScore: 90, deliveryRiskScore: 5,
      returnRiskScore: 5, evidenceConfidencePct: 90, observedSales: 0,
      daysObserved: 30, hasStableStock: true, prohibitedOrRestricted: false,
      brandOrAuthenticityConcern: false,
    });
    expect(result.verdict).not.toBe('CHAMPION');
  });

  test('hard-blocks restricted products and unreliable suppliers', () => {
    const result = scoreProduct({
      demandScore: 99, competitionScore: 5, supplierReliabilityScore: 40,
      marginPct: 50, listingQualityScore: 99, deliveryRiskScore: 1,
      returnRiskScore: 1, evidenceConfidencePct: 99, observedSales: 100,
      daysObserved: 30, hasStableStock: true, prohibitedOrRestricted: true,
      brandOrAuthenticityConcern: false,
    });
    expect(result.verdict).toBe('REJECT');
    expect(result.blockers.length).toBeGreaterThan(0);
  });
});
