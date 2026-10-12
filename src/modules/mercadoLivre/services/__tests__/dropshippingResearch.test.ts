import {
  assessProductCandidate,
  assessSupplierCandidate,
  assessSupplierValidationEvidence,
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

  test('does not validate positive supplier claims without field-linked evidence', () => {
    const signals = {
      hasCnpjOrLegalIdentity: true, hasPublicContact: true,
      hasWrittenDropshippingPolicy: true, confirmsStockSync: true,
      providesInvoice: true, providesTracking: true,
      hasClearReturnPolicy: true, hasVerifiableReputation: true,
      sampleOrderPassed: true,
    };
    const blockers = assessSupplierValidationEvidence(signals, [{ ...evidence, field: 'sampleOrderPassed' }]);
    expect(blockers).toHaveLength(8);
    expect(blockers).toContain('Evidência verificável ausente para: hasCnpjOrLegalIdentity');
    expect(blockers).not.toContain('Evidência verificável ausente para: sampleOrderPassed');
  });

  test('accepts all required claims only when every field has valid evidence', () => {
    const fields = [
      'hasCnpjOrLegalIdentity', 'hasPublicContact', 'hasWrittenDropshippingPolicy',
      'confirmsStockSync', 'providesInvoice', 'providesTracking',
      'hasClearReturnPolicy', 'hasVerifiableReputation', 'sampleOrderPassed',
    ];
    const signals = Object.fromEntries(fields.map((field) => [field, true]));
    const evidenceSet: EvidenceRecord[] = fields.map((field) => ({
      ...evidence, field, value: true, sourceUrl: 'https://example.com/evidence/' + field,
    }));
    expect(assessSupplierValidationEvidence(signals, evidenceSet)).toEqual([]);
  });

  test('requires a detailed note for manual verification evidence', () => {
    const signals = { sampleOrderPassed: true };
    const manual: EvidenceRecord = {
      sourceName: 'Verificação manual', sourceKind: 'MANUAL_VERIFICATION',
      collectedAt: '2026-10-12T10:00:00.000Z', field: 'sampleOrderPassed',
      value: true, confidencePct: 90, notes: 'ok',
    };
    expect(assessSupplierValidationEvidence(signals, [manual])).toHaveLength(1);
    expect(assessSupplierValidationEvidence(signals, [{
      ...manual, notes: 'Pedido de teste recebido e inspecionado.',
    }])).toEqual([]);
  });

});
