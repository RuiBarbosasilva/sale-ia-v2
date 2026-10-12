/**
 * Deterministic, auditable decision engine for Dropshipping Intelligence.
 * Pure functions only: no network, database, or marketplace side effects.
 */

export type SupplierValidationStatus =
  | 'PENDING_VALIDATION'
  | 'VALIDATING'
  | 'VALIDATED'
  | 'CONDITIONALLY_VALIDATED'
  | 'REJECTED'
  | 'SUSPENDED';

export type ProductVerdict = 'CHAMPION' | 'SCALE' | 'TEST' | 'WATCH' | 'REJECT';

export interface SupplierSignals {
  hasCnpjOrLegalIdentity: boolean;
  hasPublicContact: boolean;
  hasWrittenDropshippingPolicy: boolean;
  confirmsStockSync: boolean;
  providesInvoice: boolean;
  providesTracking: boolean;
  hasClearReturnPolicy: boolean;
  hasVerifiableReputation: boolean;
  sampleOrderPassed: boolean;
  repeatedDeliveryFailures?: number;
  unresolvedComplaints?: number;
}

export interface SupplierScore {
  score: number;
  status: SupplierValidationStatus;
  blockers: string[];
  passedChecks: string[];
}

export interface ProductEconomics {
  salePrice: number;
  supplierCost: number;
  marketplaceFeeRatePct: number;
  fixedMarketplaceFee: number;
  shippingCost: number;
  taxRatePct: number;
  packagingCost?: number;
  returnReserveRatePct?: number;
  otherVariableCosts?: number;
}

export interface MarginResult {
  valid: boolean;
  grossRevenue: number;
  totalCosts: number;
  estimatedProfit: number;
  marginPct: number;
  breakEvenPrice: number;
  reasons: string[];
}

export interface ProductSignals {
  demandScore: number;
  competitionScore: number;
  supplierReliabilityScore: number;
  marginPct: number;
  listingQualityScore: number;
  deliveryRiskScore: number;
  returnRiskScore: number;
  evidenceConfidencePct: number;
  observedSales?: number;
  daysObserved?: number;
  hasStableStock: boolean;
  prohibitedOrRestricted: boolean;
  brandOrAuthenticityConcern: boolean;
}

export interface ProductScore {
  score: number;
  verdict: ProductVerdict;
  reasons: string[];
  blockers: string[];
}

/** Clamp externally sourced scores to a predictable 0..100 range. */
export function normalizeScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function validNonNegative(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

/**
 * Scores suppliers based on verifiable evidence. A high score never overrides
 * critical blockers such as failed sample order or repeated delivery failures.
 */
export function scoreSupplier(signals: SupplierSignals): SupplierScore {
  const checks: Array<[keyof SupplierSignals, number, string]> = [
    ['hasCnpjOrLegalIdentity', 10, 'Identidade empresarial verificável'],
    ['hasPublicContact', 5, 'Contato público verificável'],
    ['hasWrittenDropshippingPolicy', 10, 'Política de dropshipping por escrito'],
    ['confirmsStockSync', 10, 'Sincronização de estoque confirmada'],
    ['providesInvoice', 15, 'Emissão de nota fiscal confirmada'],
    ['providesTracking', 10, 'Rastreamento disponível'],
    ['hasClearReturnPolicy', 10, 'Política de devolução clara'],
    ['hasVerifiableReputation', 10, 'Reputação verificável'],
    ['sampleOrderPassed', 20, 'Pedido-teste aprovado'],
  ];
  const passedChecks: string[] = [];
  const blockers: string[] = [];
  let score = 0;

  for (const [key, weight, label] of checks) {
    if (signals[key] === true) {
      score += weight;
      passedChecks.push(label);
    } else {
      blockers.push(`Não comprovado: ${label.toLowerCase()}`);
    }
  }

  const failures = Math.max(0, Math.floor(signals.repeatedDeliveryFailures ?? 0));
  const complaints = Math.max(0, Math.floor(signals.unresolvedComplaints ?? 0));
  score -= Math.min(30, failures * 10);
  score -= Math.min(20, complaints * 5);
  score = normalizeScore(score);

  if (!signals.hasCnpjOrLegalIdentity) blockers.push('Identidade legal não verificada');
  if (!signals.providesInvoice) blockers.push('Nota fiscal não confirmada');
  if (!signals.sampleOrderPassed) blockers.push('Pedido-teste não aprovado');
  if (failures >= 2) blockers.push('Duas ou mais falhas de entrega');
  if (complaints >= 4) blockers.push('Volume elevado de reclamações não resolvidas');

  const hardReject = !signals.hasCnpjOrLegalIdentity || !signals.providesInvoice ||
    !signals.sampleOrderPassed || failures >= 2 || complaints >= 4;
  const status: SupplierValidationStatus = hardReject
    ? 'REJECTED'
    : score >= 85 && blockers.length === 0
      ? 'VALIDATED'
      : score >= 65
        ? 'CONDITIONALLY_VALIDATED'
        : 'PENDING_VALIDATION';

  return { score, status, blockers: [...new Set(blockers)], passedChecks };
}

/**
 * Estimate per-unit economics. Percentage inputs use percentage points (e.g. 16.5).
 * Tax and marketplace fees are modeled against the sale price; reserve is too.
 */
export function calculateMargin(input: ProductEconomics): MarginResult {
  const reasons: string[] = [];
  const numeric = [
    input.salePrice, input.supplierCost, input.marketplaceFeeRatePct,
    input.fixedMarketplaceFee, input.shippingCost, input.taxRatePct,
    input.packagingCost ?? 0, input.returnReserveRatePct ?? 0,
    input.otherVariableCosts ?? 0,
  ];
  if (!numeric.every(validNonNegative) || input.salePrice <= 0) {
    return {
      valid: false, grossRevenue: 0, totalCosts: 0, estimatedProfit: 0,
      marginPct: 0, breakEvenPrice: 0,
      reasons: ['Valores devem ser finitos e não negativos; preço de venda deve ser maior que zero.'],
    };
  }
  if (input.marketplaceFeeRatePct >= 100 || input.taxRatePct >= 100 ||
      (input.returnReserveRatePct ?? 0) >= 100) {
    return {
      valid: false, grossRevenue: input.salePrice, totalCosts: 0, estimatedProfit: 0,
      marginPct: 0, breakEvenPrice: 0,
      reasons: ['Taxas percentuais devem ser inferiores a 100%.'],
    };
  }

  const variableRate = (input.marketplaceFeeRatePct + input.taxRatePct +
    (input.returnReserveRatePct ?? 0)) / 100;
  const fixedCosts = input.supplierCost + input.fixedMarketplaceFee +
    input.shippingCost + (input.packagingCost ?? 0) + (input.otherVariableCosts ?? 0);
  const profit = input.salePrice * (1 - variableRate) - fixedCosts;
  const costs = input.salePrice - profit;
  const marginPct = profit / input.salePrice * 100;
  const breakEvenPrice = variableRate >= 1 ? 0 : fixedCosts / (1 - variableRate);

  if (profit <= 0) reasons.push('Margem estimada nula ou negativa.');
  if (marginPct < 15 && profit > 0) reasons.push('Margem inferior à meta inicial de 15%.');
  if (input.salePrice < 39.9) reasons.push('Preço abaixo da faixa preferencial de teste; validar taxas fixas.');
  return {
    valid: true,
    grossRevenue: round2(input.salePrice),
    totalCosts: round2(costs),
    estimatedProfit: round2(profit),
    marginPct: round2(marginPct),
    breakEvenPrice: round2(breakEvenPrice),
    reasons,
  };
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Weighted ranking that penalizes delivery/returns and insufficient evidence. */
export function scoreProduct(signals: ProductSignals): ProductScore {
  const blockers: string[] = [];
  const reasons: string[] = [];
  if (signals.prohibitedOrRestricted) blockers.push('Produto proibido ou restrito: não publicar.');
  if (signals.brandOrAuthenticityConcern) blockers.push('Risco de marca, falsificação ou autenticidade.');
  if (!signals.hasStableStock) blockers.push('Estoque do fornecedor não está estável/confirmado.');
  if (signals.supplierReliabilityScore < 65) blockers.push('Fornecedor abaixo do mínimo de confiabilidade (65/100).');
  if (signals.marginPct <= 0) blockers.push('Produto não gera lucro estimado.');
  if (signals.evidenceConfidencePct < 35) blockers.push('Evidência insuficiente para classificar como campeão.');

  const score = normalizeScore(
    normalizeScore(signals.demandScore) * 0.25 +
    (100 - normalizeScore(signals.competitionScore)) * 0.12 +
    normalizeScore(signals.supplierReliabilityScore) * 0.18 +
    normalizeScore((signals.marginPct / 35) * 100) * 0.20 +
    normalizeScore(signals.listingQualityScore) * 0.08 +
    (100 - normalizeScore(signals.deliveryRiskScore)) * 0.07 +
    (100 - normalizeScore(signals.returnRiskScore)) * 0.05 +
    normalizeScore(signals.evidenceConfidencePct) * 0.05
  );

  if ((signals.observedSales ?? 0) > 0 && (signals.daysObserved ?? 0) >= 7) {
    reasons.push('Há vendas observadas em pelo menos sete dias de acompanhamento.');
  } else {
    reasons.push('Ainda precisa de validação com vendas reais e janela de observação suficiente.');
  }
  if (signals.marginPct >= 25) reasons.push('Margem estimada acima de 25%.');
  if (signals.supplierReliabilityScore >= 85) reasons.push('Fornecedor com score de confiabilidade alto.');
  if (signals.competitionScore >= 75) reasons.push('Concorrência intensa; diferenciar oferta e kit.');

  let verdict: ProductVerdict;
  if (blockers.length) verdict = 'REJECT';
  else if (score >= 85 && (signals.observedSales ?? 0) >= 20 && (signals.daysObserved ?? 0) >= 14 &&
    signals.evidenceConfidencePct >= 75) verdict = 'CHAMPION';
  else if (score >= 75 && (signals.observedSales ?? 0) >= 5 && (signals.daysObserved ?? 0) >= 7)
    verdict = 'SCALE';
  else if (score >= 60) verdict = 'TEST';
  else if (score >= 40) verdict = 'WATCH';
  else verdict = 'REJECT';

  return { score: round2(score), verdict, reasons, blockers };
}
