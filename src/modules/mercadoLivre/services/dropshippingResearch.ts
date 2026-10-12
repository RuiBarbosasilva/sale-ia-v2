/**
 * Provider-neutral contracts for compliant dropshipping research.
 *
 * Network collectors must implement these interfaces separately and use official
 * APIs, licensed feeds, or permitted public data. This module intentionally does
 * not scrape marketplaces or invent demand/sales figures.
 */

export type ResearchSourceKind =
  | 'SUPPLIER_OFFICIAL_CATALOG'
  | 'MARKETPLACE_OFFICIAL_API'
  | 'LICENSED_RESEARCH_PROVIDER'
  | 'MANUAL_VERIFICATION';

export interface EvidenceRecord {
  sourceName: string;
  sourceKind: ResearchSourceKind;
  sourceUrl?: string;
  collectedAt: string;
  observedAt?: string;
  field: string;
  value: string | number | boolean;
  confidencePct: number;
  notes?: string;
}

export interface SupplierCandidate {
  externalId?: string;
  name: string;
  legalName?: string;
  website?: string;
  contactUrl?: string;
  country: string;
  shipsFromBrazil: boolean;
  offersDropshipping: boolean;
  issuesInvoice?: boolean;
  stockFeedAvailable?: boolean;
  trackingAvailable?: boolean;
  returnPolicyUrl?: string;
  evidence: EvidenceRecord[];
}

export interface ProductCandidate {
  externalId?: string;
  title: string;
  canonicalUrl: string;
  marketplace: 'MERCADOLIVRE' | 'SHOPEE' | 'OTHER';
  observedPrice?: number;
  observedSales?: number;
  observedReviews?: number;
  observedStock?: number;
  shippingWeightGrams?: number;
  fragile?: boolean;
  hasSizeVariants?: boolean;
  evidence: EvidenceRecord[];
}

export interface ResearchResult<T> {
  source: string;
  collectedAt: string;
  complete: boolean;
  candidates: T[];
  warnings: string[];
}

export interface SupplierResearchAdapter {
  readonly sourceName: string;
  searchSuppliers(query: string, countryCode: string): Promise<ResearchResult<SupplierCandidate>>;
}

export interface ProductResearchAdapter {
  readonly sourceName: string;
  searchProducts(query: string, marketplace: ProductCandidate['marketplace']): Promise<ResearchResult<ProductCandidate>>;
}

export interface ResearchRunSummary {
  runId: string;
  startedAt: string;
  completedAt: string;
  sourceNames: string[];
  candidateCount: number;
  evidenceCount: number;
  warnings: string[];
  status: 'COMPLETED' | 'PARTIAL' | 'FAILED';
}

const clamp = (value: number) => Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;

/** Validates provenance metadata without treating it as proof that a claim is true. */
export function validateEvidence(evidence: EvidenceRecord): string[] {
  const errors: string[] = [];
  if (!evidence.sourceName.trim()) errors.push('sourceName obrigatório');
  if (!evidence.field.trim()) errors.push('field obrigatório');
  if (!evidence.collectedAt || Number.isNaN(Date.parse(evidence.collectedAt))) {
    errors.push('collectedAt deve ser uma data ISO válida');
  }
  if (evidence.observedAt && Number.isNaN(Date.parse(evidence.observedAt))) {
    errors.push('observedAt deve ser uma data ISO válida');
  }
  if (evidence.sourceUrl) {
    try {
      const parsed = new URL(evidence.sourceUrl);
      if (!['https:', 'http:'].includes(parsed.protocol)) errors.push('protocolo da fonte inválido');
    } catch {
      errors.push('sourceUrl inválida');
    }
  }
  if (!Number.isFinite(evidence.confidencePct) || evidence.confidencePct < 0 || evidence.confidencePct > 100) {
    errors.push('confidencePct deve estar entre 0 e 100');
  }
  return errors;
}

/**
 * Candidate is eligible for follow-up validation only when it is Brazilian,
 * explicitly offers dropshipping, has evidence, and has no malformed evidence.
 */
export function assessSupplierCandidate(candidate: SupplierCandidate): {
  eligibleForValidation: boolean;
  confidencePct: number;
  blockers: string[];
} {
  const blockers: string[] = [];
  if (!candidate.name.trim()) blockers.push('Nome do fornecedor ausente');
  if (candidate.country.toUpperCase() !== 'BR' && candidate.country.toLowerCase() !== 'brasil') {
    blockers.push('Fornecedor não identificado como brasileiro');
  }
  if (!candidate.shipsFromBrazil) blockers.push('Envio nacional não confirmado');
  if (!candidate.offersDropshipping) blockers.push('Dropshipping não confirmado');
  if (!candidate.evidence.length) blockers.push('Nenhuma evidência anexada');
  for (const evidence of candidate.evidence) {
    blockers.push(...validateEvidence(evidence).map((error) => `${evidence.field}: ${error}`));
  }
  const confidence = candidate.evidence.length
    ? candidate.evidence.reduce((sum, item) => sum + clamp(item.confidencePct), 0) / candidate.evidence.length
    : 0;
  return {
    eligibleForValidation: blockers.length === 0,
    confidencePct: Math.round(confidence * 100) / 100,
    blockers: [...new Set(blockers)],
  };
}

/** Heuristic suitability filter; scores are screening signals, not sales forecasts. */
export function assessProductCandidate(candidate: ProductCandidate): {
  candidateForTesting: boolean;
  suitabilityScore: number;
  blockers: string[];
  warnings: string[];
} {
  const blockers: string[] = [];
  const warnings: string[] = [];
  if (!candidate.title.trim()) blockers.push('Título ausente');
  try {
    const url = new URL(candidate.canonicalUrl);
    if (!['https:', 'http:'].includes(url.protocol)) blockers.push('URL inválida');
  } catch {
    blockers.push('URL inválida');
  }
  if (candidate.observedPrice !== undefined && (!Number.isFinite(candidate.observedPrice) || candidate.observedPrice <= 0)) {
    blockers.push('Preço observado inválido');
  }
  if (candidate.observedSales !== undefined && (!Number.isFinite(candidate.observedSales) || candidate.observedSales < 0)) {
    blockers.push('Contagem de vendas observadas inválida');
  }
  if (!candidate.evidence.length) blockers.push('Sem evidência de origem');
  if (candidate.fragile) warnings.push('Produto frágil: avaliar avarias e devoluções');
  if (candidate.hasSizeVariants) warnings.push('Variações de tamanho podem aumentar trocas/devoluções');
  if (candidate.shippingWeightGrams !== undefined && candidate.shippingWeightGrams > 2000) {
    warnings.push('Peso acima de 2 kg: reavaliar frete e manuseio');
  }
  if (candidate.observedSales === undefined) warnings.push('Vendas não observadas; não classificar como campeão');
  if (candidate.observedStock !== undefined && candidate.observedStock <= 0) {
    blockers.push('Sem estoque observado');
  }
  const scores = [
    candidate.observedSales !== undefined ? 25 : 0,
    candidate.observedPrice !== undefined ? 15 : 0,
    candidate.observedReviews !== undefined ? 10 : 0,
    candidate.observedStock !== undefined && candidate.observedStock > 0 ? 15 : 0,
    candidate.fragile === false ? 10 : 0,
    candidate.hasSizeVariants === false ? 10 : 0,
    candidate.shippingWeightGrams !== undefined && candidate.shippingWeightGrams <= 2000 ? 10 : 0,
    candidate.evidence.length > 0 ? 5 : 0,
  ];
  return {
    candidateForTesting: blockers.length === 0,
    suitabilityScore: scores.reduce((sum, score) => sum + score, 0),
    blockers,
    warnings,
  };
}


/**
 * A supplier signal cannot count as evidenced merely because a request body says
 * it is true. Each positive validation signal needs a matching, well-formed
 * evidence record with reasonable confidence and source provenance.
 */
export function assessSupplierValidationEvidence(
  signals: Record<string, unknown>,
  evidence: EvidenceRecord[],
  minimumConfidencePct = 70,
): string[] {
  const requiredFields = [
    'hasCnpjOrLegalIdentity', 'hasPublicContact', 'hasWrittenDropshippingPolicy',
    'confirmsStockSync', 'providesInvoice', 'providesTracking',
    'hasClearReturnPolicy', 'hasVerifiableReputation', 'sampleOrderPassed',
  ];
  const blockers: string[] = [];
  for (const field of requiredFields) {
    if (signals[field] !== true) continue;
    const supported = evidence.some((record) => {
      if (record.field !== field || record.value !== true ||
          record.confidencePct < minimumConfidencePct || validateEvidence(record).length > 0) return false;
      if (record.sourceKind === 'MANUAL_VERIFICATION') {
        return typeof record.notes === 'string' && record.notes.trim().length >= 10;
      }
      return typeof record.sourceUrl === 'string' && /^https?:\/\//i.test(record.sourceUrl);
    });
    if (!supported) blockers.push('Evidência verificável ausente para: ' + field);
  }
  return blockers;
}
