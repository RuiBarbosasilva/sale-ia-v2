import {
  assessProductCandidate,
  assessSupplierCandidate,
  validateEvidence,
  type EvidenceRecord,
} from '../dropshippingResearch';

const evidence: EvidenceRecord = {
  sourceName: 'Fornecedor — catálogo oficial',
  sourceKind: 'SUPPLIER_OFFICIAL_CATALOG',
  sourceUrl: 'https://example.com/catalogo',
  collectedAt: '2026-10-12T10:00:00.000Z',
  field: 'offersDropshipping',
  value: true,
  confidencePct: 80,
};

describe('Dropshipping research provenance contracts', () => {
  test('accepts well-formed evidence with traceable source metadata', () => {
    expect(validateEvidence(evidence)).toEqual([]);
  });

  test('rejects malformed timestamps, URL, and confidence', () => {
    expect(validateEvidence({
      ...evidence, sourceUrl: 'javascript:alert(1)', collectedAt: 'ontem', confidencePct: 150,
    })).toHaveLength(3);
  });

  test('does not accept a supplier for validation without national shipping and evidence', () => {
    const result = assessSupplierCandidate({
      name: 'Fornecedor teste', country: 'BR', shipsFromBrazil: false,
      offersDropshipping: true, evidence: [],
    });
    expect(result.eligibleForValidation).toBe(false);
    expect(result.blockers).toContain('Envio nacional não confirmado');
    expect(result.blockers).toContain('Nenhuma evidência anexada');
  });

  test('screens a product candidate without claiming it is a champion', () => {
    const result = assessProductCandidate({
      title: 'Organizador de cabos', canonicalUrl: 'https://example.com/product',
      marketplace: 'MERCADOLIVRE', observedPrice: 49.9, observedSales: 22,
      observedReviews: 5, observedStock: 20, shippingWeightGrams: 500,
      fragile: false, hasSizeVariants: false, evidence: [evidence],
    });
    expect(result.candidateForTesting).toBe(true);
    expect(result.suitabilityScore).toBe(100);
  });

  test('blocks products without stock and warns when sales are unknown', () => {
    const result = assessProductCandidate({
      title: 'Produto sem estoque', canonicalUrl: 'https://example.com/product',
      marketplace: 'SHOPEE', observedStock: 0, evidence: [evidence],
    });
    expect(result.candidateForTesting).toBe(false);
    expect(result.warnings).toContain('Vendas não observadas; não classificar como campeão');
  });
});
