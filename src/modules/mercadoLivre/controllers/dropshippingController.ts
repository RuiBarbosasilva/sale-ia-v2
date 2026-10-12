import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
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


export async function assessDropshippingSupplierCandidate(req: Request, res: Response): Promise<Response> {
  if (!isObject(req.body) || typeof req.body.name !== 'string' ||
      !req.body.name.trim() || req.body.name.length > 200 ||
      typeof req.body.country !== 'string' || typeof req.body.shipsFromBrazil !== 'boolean' ||
      typeof req.body.offersDropshipping !== 'boolean' || !Array.isArray(req.body.evidence) ||
      !req.body.evidence.every(hasValidEvidenceShape)) {
    return res.status(400).json({ error: 'INVALID_SUPPLIER_CANDIDATE' });
  }
  const optionalStrings = ['legalName', 'website', 'contactUrl', 'returnPolicyUrl'];
  if (optionalStrings.some((key) => req.body[key] !== undefined &&
      (typeof req.body[key] !== 'string' || (req.body[key] as string).length > 1000))) {
    return res.status(400).json({ error: 'INVALID_SUPPLIER_METADATA' });
  }
  const result = assessSupplierCandidate(req.body as unknown as SupplierCandidate);
  try {
    const saved = await prisma.dropshippingSupplierCandidate.create({
      data: {
        name: req.body.name.trim(),
        legalName: typeof req.body.legalName === 'string' ? req.body.legalName : null,
        website: typeof req.body.website === 'string' ? req.body.website : null,
        contactUrl: typeof req.body.contactUrl === 'string' ? req.body.contactUrl : null,
        country: req.body.country.trim().slice(0, 80),
        shipsFromBrazil: req.body.shipsFromBrazil,
        offersDropshipping: req.body.offersDropshipping,
        issuesInvoice: typeof req.body.issuesInvoice === 'boolean' ? req.body.issuesInvoice : null,
        stockFeedAvailable: typeof req.body.stockFeedAvailable === 'boolean' ? req.body.stockFeedAvailable : null,
        trackingAvailable: typeof req.body.trackingAvailable === 'boolean' ? req.body.trackingAvailable : null,
        returnPolicyUrl: typeof req.body.returnPolicyUrl === 'string' ? req.body.returnPolicyUrl : null,
        validationStatus: 'PENDING_VALIDATION',
        reliabilityScore: 0,
        evidence: JSON.stringify(req.body.evidence),
        blockers: JSON.stringify(result.blockers),
      },
      select: { id: true, name: true, validationStatus: true, reliabilityScore: true, createdAt: true },
    });
    return res.status(201).json({
      candidate: saved,
      result,
      validationAllowed: result.eligibleForValidation,
      note: 'Candidato salvo como PENDING_VALIDATION. A triagem não comprova confiabilidade nem aprova o fornecedor.',
    });
  } catch {
    return res.status(500).json({ error: 'SUPPLIER_CANDIDATE_SAVE_FAILED' });
  }
}

export async function assessDropshippingProductCandidate(req: Request, res: Response): Promise<Response> {
  if (!isObject(req.body) || typeof req.body.title !== 'string' ||
      !req.body.title.trim() || req.body.title.length > 300 ||
      typeof req.body.canonicalUrl !== 'string' || req.body.canonicalUrl.length > 2000 ||
      !['MERCADOLIVRE', 'SHOPEE', 'OTHER'].includes(String(req.body.marketplace)) ||
      !Array.isArray(req.body.evidence) || !req.body.evidence.every(hasValidEvidenceShape)) {
    return res.status(400).json({ error: 'INVALID_PRODUCT_CANDIDATE' });
  }
  const optionalNumbers = ['observedPrice', 'observedSales', 'observedReviews', 'observedStock', 'shippingWeightGrams'];
  if (optionalNumbers.some((key) => req.body[key] !== undefined &&
      (typeof req.body[key] !== 'number' || !Number.isFinite(req.body[key] as number) ||
       (req.body[key] as number) < 0))) {
    return res.status(400).json({ error: 'INVALID_PRODUCT_METRICS' });
  }
  if (req.body.observedSales !== undefined && !Number.isInteger(req.body.observedSales) ||
      req.body.observedReviews !== undefined && !Number.isInteger(req.body.observedReviews) ||
      req.body.observedStock !== undefined && !Number.isInteger(req.body.observedStock) ||
      req.body.shippingWeightGrams !== undefined && !Number.isInteger(req.body.shippingWeightGrams) ||
      ['fragile', 'hasSizeVariants'].some((key) => req.body[key] !== undefined && typeof req.body[key] !== 'boolean')) {
    return res.status(400).json({ error: 'INVALID_PRODUCT_METRICS' });
  }
  const result = assessProductCandidate(req.body as unknown as ProductCandidate);
  const status = result.blockers.length ? 'REJECT' : result.suitabilityScore >= 60 ? 'TEST' : 'WATCH';
  try {
    const candidate = await prisma.dropshippingProductCandidate.create({
      data: {
        title: req.body.title.trim(),
        externalId: typeof req.body.externalId === 'string' ? req.body.externalId.slice(0, 100) : null,
        canonicalUrl: req.body.canonicalUrl.trim(),
        marketplace: req.body.marketplace as ProductCandidate['marketplace'],
        observedPrice: typeof req.body.observedPrice === 'number' ? req.body.observedPrice : null,
        observedSales: typeof req.body.observedSales === 'number' ? req.body.observedSales : null,
        observedReviews: typeof req.body.observedReviews === 'number' ? req.body.observedReviews : null,
        observedStock: typeof req.body.observedStock === 'number' ? req.body.observedStock : null,
        shippingWeightGrams: typeof req.body.shippingWeightGrams === 'number' ? req.body.shippingWeightGrams : null,
        fragile: typeof req.body.fragile === 'boolean' ? req.body.fragile : null,
        hasSizeVariants: typeof req.body.hasSizeVariants === 'boolean' ? req.body.hasSizeVariants : null,
        evidence: JSON.stringify(req.body.evidence),
        suitabilityScore: result.suitabilityScore,
        candidateForTesting: result.candidateForTesting,
        status,
        blockers: JSON.stringify(result.blockers),
        warnings: JSON.stringify(result.warnings),
      },
      select: { id: true, title: true, marketplace: true, suitabilityScore: true, status: true, createdAt: true },
    });
    return res.status(201).json({
      candidate,
      result,
      champion: false,
      note: 'Candidato salvo. A pontuação é uma triagem; campeão exige vendas reais, margem positiva e fornecedor validado.',
    });
  } catch {
    return res.status(500).json({ error: 'PRODUCT_CANDIDATE_SAVE_FAILED' });
  }
}

export async function listDropshippingProductCandidates(req: Request, res: Response): Promise<Response> {
  const rawLimit = req.query.limit === undefined ? 50 : Number(req.query.limit);
  const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';
  const allowed = ['WATCH', 'TEST', 'SCALE', 'CHAMPION', 'REJECT'];
  if (!Number.isInteger(rawLimit) || rawLimit < 1 || rawLimit > 100 || (status && !allowed.includes(status))) {
    return res.status(400).json({ success: false, error: 'INVALID_PRODUCT_FILTER' });
  }
  try {
    const candidates = await prisma.dropshippingProductCandidate.findMany({
      where: status ? { status } : undefined,
      take: rawLimit,
      orderBy: [{ suitabilityScore: 'desc' }, { createdAt: 'desc' }],
    });
    return res.json({
      success: true,
      count: candidates.length,
      candidates: candidates.map((item) => ({
        ...item,
        evidence: JSON.parse(item.evidence),
        blockers: item.blockers ? JSON.parse(item.blockers) : [],
        warnings: item.warnings ? JSON.parse(item.warnings) : [],
      })),
    });
  } catch {
    return res.status(500).json({ success: false, error: 'PRODUCT_CANDIDATES_ERROR' });
  }
}
import { searchMercadoLivreCatalog } from '../services/mercadoLivreResearchAdapter';

export async function searchDropshippingMarketplace(req: Request, res: Response): Promise<Response> {
  try {
    const result = await searchMercadoLivreCatalog(req.query.q, req.query.limit);
    const run = await prisma.dropshippingResearchRun.create({
      data: {
        query: result.query,
        source: result.source,
        status: 'COMPLETED',
        totalResults: result.totalResults,
        resultCount: result.results.length,
        collectedAt: new Date(result.collectedAt),
        resultSummary: JSON.stringify({ warnings: result.results.reduce((n, item) => n + item.warnings.length, 0) }),
        snapshots: {
          create: result.results.map((item) => ({
            itemId: item.id,
            title: item.title,
            price: item.price,
            currency: item.currency,
            availableQuantity: item.availableQuantity,
            soldQuantity: item.soldQuantity,
            condition: item.condition,
            url: item.url,
            categoryId: item.categoryId,
            freeShipping: item.freeShipping,
            sellerId: item.sellerId,
            evidenceConfidencePct: item.evidenceConfidencePct,
            warnings: JSON.stringify(item.warnings),
            observedAt: new Date(result.collectedAt),
          })),
        },
      },
      select: { id: true, query: true, source: true, totalResults: true, resultCount: true, collectedAt: true },
    });
    return res.json({
      success: true,
      researchRun: run,
      result,
      note: 'Resultados observados no catálogo público e persistidos para comparação histórica; não representam vendas confirmadas nem previsão de demanda.',
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

export async function listDropshippingResearchRuns(req: Request, res: Response): Promise<Response> {
  const rawLimit = req.query.limit === undefined ? 20 : Number(req.query.limit);
  if (!Number.isInteger(rawLimit) || rawLimit < 1 || rawLimit > 100) {
    return res.status(400).json({ success: false, error: 'INVALID_PAGINATION' });
  }
  try {
    const runs = await prisma.dropshippingResearchRun.findMany({
      take: rawLimit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, query: true, source: true, status: true,
        totalResults: true, resultCount: true, collectedAt: true, createdAt: true,
      },
    });
    return res.json({ success: true, count: runs.length, runs });
  } catch {
    return res.status(500).json({ success: false, error: 'DROPSHIPPING_RESEARCH_HISTORY_ERROR' });
  }
}

export async function listDropshippingSnapshots(req: Request, res: Response): Promise<Response> {
  const runId = typeof req.query.runId === 'string' ? req.query.runId.trim() : '';
  const rawLimit = req.query.limit === undefined ? 50 : Number(req.query.limit);
  if (!Number.isInteger(rawLimit) || rawLimit < 1 || rawLimit > 100) {
    return res.status(400).json({ success: false, error: 'INVALID_PAGINATION' });
  }
  try {
    const snapshots = await prisma.dropshippingCatalogSnapshot.findMany({
      where: runId ? { runId } : undefined,
      take: rawLimit,
      orderBy: { observedAt: 'desc' },
    });
    return res.json({
      success: true,
      count: snapshots.length,
      snapshots: snapshots.map((item) => ({
        ...item,
        warnings: item.warnings ? JSON.parse(item.warnings) : [],
      })),
    });
  } catch {
    return res.status(500).json({ success: false, error: 'DROPSHIPPING_SNAPSHOTS_ERROR' });
  }
}

export async function listDropshippingSupplierCandidates(req: Request, res: Response): Promise<Response> {
  const rawLimit = req.query.limit === undefined ? 50 : Number(req.query.limit);
  const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';
  const allowedStatuses = ['PENDING_VALIDATION', 'VALIDATING', 'VALIDATED', 'CONDITIONALLY_VALIDATED', 'REJECTED', 'SUSPENDED'];
  if (!Number.isInteger(rawLimit) || rawLimit < 1 || rawLimit > 100 ||
      (status && !allowedStatuses.includes(status))) {
    return res.status(400).json({ success: false, error: 'INVALID_SUPPLIER_FILTER' });
  }
  try {
    const candidates = await prisma.dropshippingSupplierCandidate.findMany({
      where: status ? { validationStatus: status } : undefined,
      take: rawLimit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, name: true, legalName: true, website: true, contactUrl: true,
        country: true, shipsFromBrazil: true, offersDropshipping: true,
        issuesInvoice: true, stockFeedAvailable: true, trackingAvailable: true,
        returnPolicyUrl: true, validationStatus: true, reliabilityScore: true,
        evidence: true, blockers: true, lastVerifiedAt: true, createdAt: true, updatedAt: true,
      },
    });
    return res.json({
      success: true,
      count: candidates.length,
      candidates: candidates.map((candidate) => ({
        ...candidate,
        evidence: JSON.parse(candidate.evidence),
        blockers: candidate.blockers ? JSON.parse(candidate.blockers) : [],
      })),
    });
  } catch {
    return res.status(500).json({ success: false, error: 'SUPPLIER_CANDIDATES_ERROR' });
  }
}

export async function validateDropshippingSupplierCandidate(req: Request, res: Response): Promise<Response> {
  const id = typeof req.params.id === 'string' ? req.params.id.trim() : '';
  if (!id || id.length > 100 || !isObject(req.body)) {
    return res.status(400).json({ success: false, error: 'INVALID_SUPPLIER_VALIDATION_REQUEST' });
  }
  const booleanFields = [
    'hasCnpjOrLegalIdentity', 'hasPublicContact', 'hasWrittenDropshippingPolicy',
    'confirmsStockSync', 'providesInvoice', 'providesTracking',
    'hasClearReturnPolicy', 'hasVerifiableReputation', 'sampleOrderPassed',
  ];
  if (!booleanFields.every((key) => typeof req.body[key] === 'boolean') ||
      !Array.isArray(req.body.evidence) || !req.body.evidence.every(hasValidEvidenceShape)) {
    return res.status(400).json({ success: false, error: 'INVALID_SUPPLIER_VALIDATION_SIGNALS' });
  }
  const counters = ['repeatedDeliveryFailures', 'unresolvedComplaints'];
  if (counters.some((key) => req.body[key] !== undefined &&
      (typeof req.body[key] !== 'number' || !Number.isInteger(req.body[key] as number) ||
       (req.body[key] as number) < 0 || (req.body[key] as number) > 10000))) {
    return res.status(400).json({ success: false, error: 'INVALID_SUPPLIER_VALIDATION_COUNTERS' });
  }
  try {
    const existing = await prisma.dropshippingSupplierCandidate.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, error: 'SUPPLIER_CANDIDATE_NOT_FOUND' });
    const score = scoreSupplier(req.body as unknown as SupplierSignals);
    const priorEvidence: unknown[] = JSON.parse(existing.evidence);
    const evidence = [...priorEvidence, ...req.body.evidence];
    const updated = await prisma.dropshippingSupplierCandidate.update({
      where: { id },
      data: {
        validationStatus: score.status,
        reliabilityScore: score.score,
        blockers: JSON.stringify(score.blockers),
        evidence: JSON.stringify(evidence),
        lastVerifiedAt: new Date(),
      },
      select: { id: true, name: true, validationStatus: true, reliabilityScore: true, blockers: true, lastVerifiedAt: true },
    });
    if (score.status !== 'VALIDATED') {
      const title = 'Fornecedor exige validação: ' + existing.name;
      const priorAlert = await prisma.dropshippingAlert.findFirst({
        where: { type: 'SUPPLIER_VALIDATION', title, status: 'OPEN' },
      });
      const alertData = {
        severity: score.status === 'REJECTED' ? 'WARNING' : 'INFO',
        message: score.blockers.join('; ') || 'Fornecedor requer revisão manual.',
        payload: JSON.stringify({ candidateId: id, validationStatus: score.status, score: score.score }),
      };
      if (priorAlert) {
        await prisma.dropshippingAlert.update({ where: { id: priorAlert.id }, data: alertData });
      } else {
        await prisma.dropshippingAlert.create({
          data: { type: 'SUPPLIER_VALIDATION', title, ...alertData },
        });
      }
    }
    return res.json({
      success: true,
      candidate: { ...updated, blockers: updated.blockers ? JSON.parse(updated.blockers) : [] },
      score,
      note: score.status === 'VALIDATED'
        ? 'Fornecedor aprovado pelas regras atuais; mantenha monitoramento de estoque, entrega e reclamações.'
        : 'Fornecedor não aprovado para publicação automática. Resolva os bloqueios e revalide.',
    });
  } catch {
    return res.status(500).json({ success: false, error: 'SUPPLIER_CANDIDATE_VALIDATION_FAILED' });
  }
}

export async function listDropshippingAlerts(req: Request, res: Response): Promise<Response> {
  const rawLimit = req.query.limit === undefined ? 50 : Number(req.query.limit);
  const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';
  if (!Number.isInteger(rawLimit) || rawLimit < 1 || rawLimit > 100 ||
      (status && !['OPEN', 'RESOLVED'].includes(status))) {
    return res.status(400).json({ success: false, error: 'INVALID_ALERT_FILTER' });
  }
  try {
    const alerts = await prisma.dropshippingAlert.findMany({
      where: status ? { status } : undefined,
      take: rawLimit,
      orderBy: { createdAt: 'desc' },
    });
    return res.json({ success: true, count: alerts.length, alerts });
  } catch {
    return res.status(500).json({ success: false, error: 'DROPSHIPPING_ALERTS_ERROR' });
  }
}

export async function resolveDropshippingAlert(req: Request, res: Response): Promise<Response> {
  const id = typeof req.params.id === 'string' ? req.params.id.trim() : '';
  if (!id || id.length > 100) return res.status(400).json({ success: false, error: 'INVALID_ALERT_ID' });
  try {
    const existing = await prisma.dropshippingAlert.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, error: 'DROPSHIPPING_ALERT_NOT_FOUND' });
    const alert = await prisma.dropshippingAlert.update({
      where: { id },
      data: { status: 'RESOLVED', resolvedAt: new Date() },
    });
    return res.json({ success: true, alert });
  } catch {
    return res.status(500).json({ success: false, error: 'DROPSHIPPING_ALERT_RESOLVE_ERROR' });
  }
}

export async function getDropshippingPriceHistory(req: Request, res: Response): Promise<Response> {
  const itemId = typeof req.params.itemId === 'string' ? req.params.itemId.trim() : '';
  const rawLimit = req.query.limit === undefined ? 30 : Number(req.query.limit);
  if (!/^MLB-?\d{6,15}$/i.test(itemId) || !Number.isInteger(rawLimit) || rawLimit < 2 || rawLimit > 100) {
    return res.status(400).json({ success: false, error: 'INVALID_PRICE_HISTORY_FILTER' });
  }
  try {
    const snapshots = await prisma.dropshippingCatalogSnapshot.findMany({
      where: { itemId },
      take: rawLimit,
      orderBy: { observedAt: 'desc' },
      select: {
        itemId: true, title: true, price: true, availableQuantity: true,
        soldQuantity: true, url: true, observedAt: true, runId: true,
      },
    });
    const chronological = [...snapshots].reverse();
    const first = chronological[0];
    const last = chronological[chronological.length - 1];
    const priceChange = first && last ? Number((last.price - first.price).toFixed(2)) : 0;
    const priceChangePct = first && first.price > 0
      ? Number((priceChange / first.price * 100).toFixed(2))
      : null;
    return res.json({
      success: true,
      itemId,
      snapshotCount: snapshots.length,
      priceChange,
      priceChangePct,
      firstObservedAt: first?.observedAt ?? null,
      lastObservedAt: last?.observedAt ?? null,
      snapshots: chronological,
      note: 'Histórico disponível somente para coletas feitas pelo Sale-IA; não representa todo o mercado.',
    });
  } catch {
    return res.status(500).json({ success: false, error: 'DROPSHIPPING_PRICE_HISTORY_ERROR' });
  }
}
