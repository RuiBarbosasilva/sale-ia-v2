import { Request, Response } from 'express';
import {
  assessProductCandidate,
  assessSupplierCandidate,
  type ProductCandidate,
  type SupplierCandidate,
} from '../services/dropshippingResearch';
import {
  calculateMargin,
  scoreProduct,
  scoreSupplier,
  type ProductEconomics,
  type ProductSignals,
  type SupplierSignals,
} from '../services/dropshippingIntelligence';

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}


function hasValidEvidenceShape(value: unknown): boolean {
  if (!isObject(value)) return false;
  const sourceKinds = [
    'SUPPLIER_OFFICIAL_CATALOG', 'MARKETPLACE_OFFICIAL_API',
    'LICENSED_RESEARCH_PROVIDER', 'MANUAL_VERIFICATION',
  ];
  return typeof value.sourceName === 'string' &&
    typeof value.sourceKind === 'string' && sourceKinds.includes(value.sourceKind) &&
    typeof value.collectedAt === 'string' &&
    typeof value.field === 'string' &&
    ['string', 'number', 'boolean'].includes(typeof value.value) &&
    typeof value.confidencePct === 'number' && Number.isFinite(value.confidencePct) &&
    (value.sourceUrl === undefined || typeof value.sourceUrl === 'string') &&
    (value.observedAt === undefined || typeof value.observedAt === 'string') &&
    (value.notes === undefined || typeof value.notes === 'string');
}

function numericFieldsPresent(value: Record<string, unknown>, fields: string[]): boolean {
  return fields.every((field) => typeof value[field] === 'number' && Number.isFinite(value[field] as number));
}

export function calculateDropshippingMargin(req: Request, res: Response): Response {
  if (!isObject(req.body)) return res.status(400).json({ error: 'INVALID_BODY' });
  const body = req.body;
  const required = ['salePrice', 'supplierCost', 'marketplaceFeeRatePct', 'fixedMarketplaceFee', 'shippingCost', 'taxRatePct'];
  if (!numericFieldsPresent(body, required)) {
    return res.status(400).json({
      error: 'INVALID_ECONOMICS',
      message: 'Informe preço, custo, taxas, frete e impostos como números finitos não negativos.',
    });
  }
  const optionalCosts = ['packagingCost', 'otherVariableCosts'];
  const optionalRates = ['returnReserveRatePct'];
  if (optionalCosts.some((key) => body[key] !== undefined &&
      (typeof body[key] !== 'number' || !Number.isFinite(body[key] as number) || (body[key] as number) < 0)) ||
      optionalRates.some((key) => body[key] !== undefined &&
      (typeof body[key] !== 'number' || !Number.isFinite(body[key] as number) || (body[key] as number) < 0 || (body[key] as number) >= 100))) {
    return res.status(400).json({ error: 'INVALID_OPTIONAL_ECONOMICS' });
  }
  if (Number(body.marketplaceFeeRatePct) >= 100 || Number(body.taxRatePct) >= 100 ||
      Number(body.marketplaceFeeRatePct) + Number(body.taxRatePct) + Number(body.returnReserveRatePct ?? 0) >= 100) {
    return res.status(422).json({ error: 'NON_POSITIVE_REVENUE_FACTOR', message: 'A soma das taxas percentuais deve ser inferior a 100%.' });
  }
  if (required.some((key) => (body[key] as number) < 0) || Number(body.salePrice) <= 0) {
    return res.status(400).json({ error: 'NEGATIVE_OR_ZERO_ECONOMICS' });
  }
  const result = calculateMargin(body as unknown as ProductEconomics);
  if (!result.valid) return res.status(422).json({ result });
  return res.json({ result });
}

export function evaluateDropshippingSupplier(req: Request, res: Response): Response {
  if (!isObject(req.body)) return res.status(400).json({ error: 'INVALID_BODY' });
  const required = [
    'hasCnpjOrLegalIdentity', 'hasPublicContact', 'hasWrittenDropshippingPolicy',
    'confirmsStockSync', 'providesInvoice', 'providesTracking',
    'hasClearReturnPolicy', 'hasVerifiableReputation', 'sampleOrderPassed',
  ];
  if (!required.every((key) => typeof req.body[key] === 'boolean')) {
    return res.status(400).json({
      error: 'INVALID_SUPPLIER_SIGNALS',
      message: 'Todos os indicadores de validação do fornecedor devem ser booleanos.',
    });
  }
  const optionalCounters = ['repeatedDeliveryFailures', 'unresolvedComplaints'];
  if (optionalCounters.some((key) => req.body[key] !== undefined &&
      (typeof req.body[key] !== 'number' || !Number.isFinite(req.body[key] as number) ||
       (req.body[key] as number) < 0 || !Number.isInteger(req.body[key] as number)))) {
    return res.status(400).json({ error: 'INVALID_SUPPLIER_COUNTERS' });
  }
  const result = scoreSupplier(req.body as unknown as SupplierSignals);
  return res.json({ result, publicationAllowed: result.status === 'VALIDATED' });
}

export function evaluateDropshippingProduct(req: Request, res: Response): Response {
  if (!isObject(req.body)) return res.status(400).json({ error: 'INVALID_BODY' });
  const requiredNumbers = [
    'demandScore', 'competitionScore', 'supplierReliabilityScore', 'marginPct',
    'listingQualityScore', 'deliveryRiskScore', 'returnRiskScore', 'evidenceConfidencePct',
  ];
  const requiredBooleans = [
    'hasStableStock', 'prohibitedOrRestricted', 'brandOrAuthenticityConcern',
  ];
  if (!numericFieldsPresent(req.body, requiredNumbers) ||
      !requiredBooleans.every((key) => typeof req.body[key] === 'boolean')) {
    return res.status(400).json({
      error: 'INVALID_PRODUCT_SIGNALS',
      message: 'Indicadores de pontuação inválidos ou incompletos.',
    });
  }
  const boundedScores = ['demandScore', 'competitionScore', 'supplierReliabilityScore', 'listingQualityScore', 'deliveryRiskScore', 'returnRiskScore', 'evidenceConfidencePct'];
  if (boundedScores.some((key) => (req.body[key] as number) < 0 || (req.body[key] as number) > 100) ||
      (req.body.marginPct as number) < -100 ||
      (req.body.observedSales !== undefined && (typeof req.body.observedSales !== 'number' || !Number.isFinite(req.body.observedSales) || req.body.observedSales < 0)) ||
      (req.body.daysObserved !== undefined && (typeof req.body.daysObserved !== 'number' || !Number.isFinite(req.body.daysObserved) || req.body.daysObserved < 0))) {
    return res.status(400).json({ error: 'OUT_OF_RANGE_PRODUCT_SIGNALS' });
  }
  const result = scoreProduct(req.body as unknown as ProductSignals);
  return res.json({ result, publicationAllowed: false, note: 'A pontuação não publica anúncios nem faz pedidos automaticamente.' });
}

export function getDropshippingRules(_req: Request, res: Response): Response {
  return res.json({
    version: 1,
    supplier: {
      scale: '0-100',
      requiredSignals: [
        'hasCnpjOrLegalIdentity', 'hasPublicContact', 'hasWrittenDropshippingPolicy',
        'confirmsStockSync', 'providesInvoice', 'providesTracking',
        'hasClearReturnPolicy', 'hasVerifiableReputation', 'sampleOrderPassed',
      ],
      hardBlockers: [
        'Identidade legal não verificada', 'Nota fiscal não confirmada',
        'Pedido-teste não aprovado', 'Duas ou mais falhas de entrega',
        'Quatro ou mais reclamações não resolvidas',
      ],
      statusValues: ['PENDING_VALIDATION', 'VALIDATING', 'VALIDATED', 'CONDITIONALLY_VALIDATED', 'REJECTED', 'SUSPENDED'],
    },
    product: {
      score: '0-100',
      weights: {
        demand: 0.25,
        competition: 0.12,
        supplierReliability: 0.18,
        margin: 0.20,
        listingQuality: 0.08,
        deliveryRisk: 0.07,
        returnRisk: 0.05,
        evidenceConfidence: 0.05,
      },
      championRequires: {
        minimumScore: 85,
        minimumObservedSales: 20,
        minimumObservationDays: 14,
        minimumEvidenceConfidencePct: 75,
      },
      verdicts: ['CHAMPION', 'SCALE', 'TEST', 'WATCH', 'REJECT'],
      publicationRequiresSeparateExplicitApproval: true,
    },
    economics: {
      percentageUnits: 'percentage points; send 16.5 for 16.5%',
      formula: 'profit = salePrice * (1 - marketplaceFeeRate - taxRate - returnReserveRate) - fixedCosts',
      configurableInputs: [
        'supplierCost', 'marketplaceFeeRatePct', 'fixedMarketplaceFee', 'shippingCost',
        'taxRatePct', 'packagingCost', 'returnReserveRatePct', 'otherVariableCosts',
      ],
    },
    limitations: [
      'Scores are decision support, not proof of real supplier reliability.',
      'No external supplier/product research is performed by this endpoint.',
      'No database writes, marketplace publishing, or supplier purchase is performed.',
    ],
  });
}


export function assessDropshippingSupplierCandidate(req: Request, res: Response): Response {
  if (!isObject(req.body) || typeof req.body.name !== 'string' ||
      typeof req.body.country !== 'string' || typeof req.body.shipsFromBrazil !== 'boolean' ||
      typeof req.body.offersDropshipping !== 'boolean' || !Array.isArray(req.body.evidence) ||
      !req.body.evidence.every(hasValidEvidenceShape)) {
    return res.status(400).json({ error: 'INVALID_SUPPLIER_CANDIDATE' });
  }
  const result = assessSupplierCandidate(req.body as unknown as SupplierCandidate);
  return res.json({ result, validationAllowed: result.eligibleForValidation });
}

export function assessDropshippingProductCandidate(req: Request, res: Response): Response {
  if (!isObject(req.body) || typeof req.body.title !== 'string' ||
      typeof req.body.canonicalUrl !== 'string' ||
      !['MERCADOLIVRE', 'SHOPEE', 'OTHER'].includes(String(req.body.marketplace)) ||
      !Array.isArray(req.body.evidence) || !req.body.evidence.every(hasValidEvidenceShape)) {
    return res.status(400).json({ error: 'INVALID_PRODUCT_CANDIDATE' });
  }
  const result = assessProductCandidate(req.body as unknown as ProductCandidate);
  return res.json({
    result,
    champion: false,
    note: 'Triagem inicial apenas; valide fornecedor, custos e vendas observadas antes de investir.',
  });
}
import { searchMercadoLivreCatalog } from '../services/mercadoLivreResearchAdapter';

export async function searchDropshippingMarketplace(req: Request, res: Response): Promise<Response> {
  try {
    const result = await searchMercadoLivreCatalog(req.query.q, req.query.limit);
    return res.json({
      success: true,
      result,
      note: 'Resultados observados no catálogo público; não representam vendas confirmadas nem previsão de demanda.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'MARKETPLACE_RESEARCH_ERROR';
    const status = message === 'INVALID_RESEARCH_QUERY' || message === 'INVALID_RESEARCH_LIMIT'
      ? 400
      : message === 'MARKETPLACE_RATE_LIMITED'
        ? 429
        : (typeof error === 'object' && error !== null && 'status' in error &&
           typeof (error as { status?: unknown }).status === 'number')
          ? (error as { status: number }).status
          : message === 'AbortError' || message === 'TimeoutError'
            ? 504
            : 502;
    return res.status(status).json({
      success: false,
      error: status === 400 ? message : status === 429 ? 'MARKETPLACE_RATE_LIMITED' : 'MARKETPLACE_RESEARCH_UNAVAILABLE',
      requestId: (req as any).requestId,
    });
  }
}
