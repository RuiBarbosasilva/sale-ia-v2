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
      !Array.isArray(req.body.evidence) || req.body.evidence.length === 0 || !req.body.evidence.every(hasValidEvidenceShape)) {
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
  let economics: ProductEconomics | null = null;
  let marginResult: ReturnType<typeof calculateMargin> | null = null;
  if (req.body.economics !== undefined) {
    if (!isObject(req.body.economics)) return res.status(400).json({ error: 'INVALID_PRODUCT_ECONOMICS' });
    const required = ['salePrice', 'supplierCost', 'marketplaceFeeRatePct', 'fixedMarketplaceFee', 'shippingCost', 'taxRatePct'];
    const optional = ['packagingCost', 'returnReserveRatePct', 'otherVariableCosts'];
    if (required.some((key) => typeof req.body.economics[key] !== 'number' ||
        !Number.isFinite(req.body.economics[key] as number) || (req.body.economics[key] as number) < 0) ||
        optional.some((key) => req.body.economics[key] !== undefined &&
        (typeof req.body.economics[key] !== 'number' || !Number.isFinite(req.body.economics[key] as number) ||
         (req.body.economics[key] as number) < 0))) {
      return res.status(400).json({ error: 'INVALID_PRODUCT_ECONOMICS' });
    }
    economics = req.body.economics as unknown as ProductEconomics;
    marginResult = calculateMargin(economics);
    if (!marginResult.valid) return res.status(400).json({ error: 'INVALID_PRODUCT_ECONOMICS', reasons: marginResult.reasons });
  }
  const result = assessProductCandidate(req.body as unknown as ProductCandidate);
  const blockers = [...result.blockers];
  if (marginResult && marginResult.estimatedProfit <= 0) {
    blockers.push('Margem estimada nula ou negativa; rever custos antes de testar.');
  }
  const candidateForTesting = result.candidateForTesting && (!marginResult || marginResult.estimatedProfit > 0);
  const status = blockers.length ? 'REJECT' : result.suitabilityScore >= 60 ? 'TEST' : 'WATCH';
  try {
    const candidate = await prisma.dropshippingProductCandidate.create({
      data: {
        title: req.body.title.trim(),
        externalId: typeof req.body.externalId === 'string' ? req.body.externalId.slice(0, 100) : null,
        canonicalUrl: req.body.canonicalUrl.trim(),
        marketplace: req.body.marketplace as ProductCandidate['marketplace'],
        observedPrice: typeof req.body.observedPrice === 'number' ? req.body.observedPrice : null,
        salePrice: economics?.salePrice ?? null,
        supplierCost: economics?.supplierCost ?? null,
        marketplaceFeeRatePct: economics?.marketplaceFeeRatePct ?? null,
        fixedMarketplaceFee: economics?.fixedMarketplaceFee ?? null,
        shippingCost: economics?.shippingCost ?? null,
        taxRatePct: economics?.taxRatePct ?? null,
        packagingCost: economics?.packagingCost ?? null,
        returnReserveRatePct: economics?.returnReserveRatePct ?? null,
        otherVariableCosts: economics?.otherVariableCosts ?? null,
        estimatedProfit: marginResult?.estimatedProfit ?? null,
        marginPct: marginResult?.marginPct ?? null,
        breakEvenPrice: marginResult?.breakEvenPrice ?? null,
        observedSales: typeof req.body.observedSales === 'number' ? req.body.observedSales : null,
        observedReviews: typeof req.body.observedReviews === 'number' ? req.body.observedReviews : null,
        observedStock: typeof req.body.observedStock === 'number' ? req.body.observedStock : null,
        shippingWeightGrams: typeof req.body.shippingWeightGrams === 'number' ? req.body.shippingWeightGrams : null,
        fragile: typeof req.body.fragile === 'boolean' ? req.body.fragile : null,
        hasSizeVariants: typeof req.body.hasSizeVariants === 'boolean' ? req.body.hasSizeVariants : null,
        evidence: JSON.stringify(req.body.evidence),
        suitabilityScore: result.suitabilityScore,
        candidateForTesting,
        status,
        blockers: JSON.stringify(blockers),
        warnings: JSON.stringify(result.warnings),
      },
      select: { id: true, title: true, marketplace: true, suitabilityScore: true, status: true, createdAt: true },
    });
    return res.status(201).json({
      candidate,
      result: { ...result, candidateForTesting, blockers },
      margin: marginResult,
      champion: false,
      note: 'Candidato salvo. Quando os custos são informados, margem nula ou negativa bloqueia o teste; campeão exige vendas reais, margem positiva e fornecedor validado.',
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
    const previousSnapshots = await Promise.all(result.results.map(async (item) => ({
      item,
      previous: await prisma.dropshippingCatalogSnapshot.findFirst({
        where: { itemId: item.id },
        orderBy: { observedAt: 'desc' },
        select: { price: true, availableQuantity: true, observedAt: true },
      }),
    })));
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
    let alertsCreatedOrUpdated = 0;
    for (const { item, previous } of previousSnapshots) {
      if (!previous) continue;
      const priceChangePct = previous.price > 0
        ? ((item.price - previous.price) / previous.price) * 100
        : 0;
      const alertSpecs: Array<{ type: string; title: string; severity: string; message: string; payload: string }> = [];
      if (Math.abs(priceChangePct) >= 10) {
        const roundedPct = Number(priceChangePct.toFixed(2));
        alertSpecs.push({
          type: 'PRICE_MOVEMENT',
          title: 'Mudança de preço observada: ' + item.id,
          severity: Math.abs(priceChangePct) >= 25 ? 'WARNING' : 'INFO',
          message: 'Preço observado mudou de R$ ' + previous.price.toFixed(2) + ' para R$ ' +
            item.price.toFixed(2) + ' (' + roundedPct + '%). Verifique novamente antes de precificar.',
          payload: JSON.stringify({ itemId: item.id, previousPrice: previous.price, currentPrice: item.price, changePct: roundedPct, url: item.url }),
        });
      }
      if (previous.availableQuantity !== null && previous.availableQuantity > 0 &&
          item.availableQuantity === 0) {
        alertSpecs.push({
          type: 'STOCK_RISK',
          title: 'Estoque zerado observado: ' + item.id,
          severity: 'WARNING',
          message: 'A coleta anterior indicava estoque ' + previous.availableQuantity + '; a coleta atual indica zero.',
          payload: JSON.stringify({ itemId: item.id, previousStock: previous.availableQuantity, currentStock: 0, url: item.url }),
        });
      } else if (previous.availableQuantity !== null && previous.availableQuantity > 0 &&
          item.availableQuantity !== null && item.availableQuantity > 0 &&
          item.availableQuantity <= previous.availableQuantity * 0.5) {
        alertSpecs.push({
          type: 'STOCK_RISK',
          title: 'Queda de estoque observada: ' + item.id,
          severity: 'INFO',
          message: 'Estoque observado caiu de ' + previous.availableQuantity + ' para ' + item.availableQuantity + '.',
          payload: JSON.stringify({ itemId: item.id, previousStock: previous.availableQuantity, currentStock: item.availableQuantity, url: item.url }),
        });
      }
      for (const spec of alertSpecs) {
        const existingAlert = await prisma.dropshippingAlert.findFirst({
          where: { type: spec.type, title: spec.title, status: 'OPEN' },
          select: { id: true },
        });
        if (existingAlert) {
          await prisma.dropshippingAlert.update({
            where: { id: existingAlert.id },
            data: { severity: spec.severity, message: spec.message, payload: spec.payload },
          });
        } else {
          await prisma.dropshippingAlert.create({ data: spec });
        }
        alertsCreatedOrUpdated += 1;
      }
    }
    return res.json({
      success: true,
      researchRun: run,
      alertsCreatedOrUpdated,
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

export async function importLatestDropshippingResearchAsCandidates(req: Request, res: Response): Promise<Response> {
  try {
    const run = await prisma.dropshippingResearchRun.findFirst({
      orderBy: { createdAt: 'desc' },
      include: { snapshots: { take: 100, orderBy: { observedAt: 'desc' } } },
    });
    if (!run) return res.status(404).json({ success: false, error: 'NO_RESEARCH_RUN_FOUND' });
    if (!run.snapshots.length) {
      return res.json({ success: true, runId: run.id, imported: 0, skippedExisting: 0, message: 'A última pesquisa não contém anúncios para importar.' });
    }
    const ids = run.snapshots.map((item) => item.itemId);
    const existing = await prisma.dropshippingProductCandidate.findMany({
      where: { marketplace: 'MERCADOLIVRE', externalId: { in: ids } },
      select: { externalId: true },
    });
    const existingIds = new Set(existing.map((item) => item.externalId).filter((id): id is string => Boolean(id)));
    let imported = 0;
    let skippedExisting = 0;
    for (const item of run.snapshots) {
      if (existingIds.has(item.itemId)) {
        skippedExisting += 1;
        continue;
      }
      const evidence = [{
        sourceName: 'API pública oficial do Mercado Livre Brasil',
        sourceKind: 'MARKETPLACE_OFFICIAL_API' as const,
        collectedAt: run.collectedAt.toISOString(),
        observedAt: item.observedAt.toISOString(),
        field: 'observedPrice',
        value: item.price,
        sourceUrl: item.url,
        confidencePct: item.evidenceConfidencePct,
      }];
      const candidateInput: ProductCandidate = {
        externalId: item.itemId,
        title: item.title,
        canonicalUrl: item.url,
        marketplace: 'MERCADOLIVRE',
        observedPrice: item.price,
        observedSales: item.soldQuantity ?? undefined,
        observedStock: item.availableQuantity ?? undefined,
        evidence,
      };
      const assessment = assessProductCandidate(candidateInput);
      const status = assessment.blockers.length ? 'REJECT' : assessment.suitabilityScore >= 60 ? 'TEST' : 'WATCH';
      await prisma.dropshippingProductCandidate.create({
        data: {
          title: item.title,
          externalId: item.itemId,
          canonicalUrl: item.url,
          marketplace: 'MERCADOLIVRE',
          observedPrice: item.price,
          observedSales: item.soldQuantity,
          observedStock: item.availableQuantity,
          evidence: JSON.stringify(evidence),
          suitabilityScore: assessment.suitabilityScore,
          candidateForTesting: assessment.candidateForTesting,
          status,
          blockers: JSON.stringify(assessment.blockers),
          warnings: JSON.stringify(assessment.warnings),
        },
      });
      existingIds.add(item.itemId);
      imported += 1;
    }
    return res.json({
      success: true,
      runId: run.id,
      query: run.query,
      imported,
      skippedExisting,
      totalSnapshots: run.snapshots.length,
      note: 'Importação cria candidatos WATCH/TEST/REJECT com evidências da coleta. Não comprova demanda nem promove produtos a campeões.',
    });
  } catch {
    return res.status(500).json({ success: false, error: 'DROPSHIPPING_CANDIDATE_IMPORT_FAILED' });
  }
}

export async function updateDropshippingProductEconomics(req: Request, res: Response): Promise<Response> {
  const id = typeof req.params.id === 'string' ? req.params.id.trim() : '';
  if (!id || id.length > 100 || !isObject(req.body) || !isObject(req.body.economics)) {
    return res.status(400).json({ success: false, error: 'INVALID_PRODUCT_ECONOMICS_REQUEST' });
  }
  const input = req.body.economics;
  const required = ['salePrice', 'supplierCost', 'marketplaceFeeRatePct', 'fixedMarketplaceFee', 'shippingCost', 'taxRatePct'];
  const optional = ['packagingCost', 'returnReserveRatePct', 'otherVariableCosts'];
  if (required.some((key) => typeof input[key] !== 'number' || !Number.isFinite(input[key] as number) ||
      (input[key] as number) < 0) ||
      optional.some((key) => input[key] !== undefined &&
      (typeof input[key] !== 'number' || !Number.isFinite(input[key] as number) || (input[key] as number) < 0))) {
    return res.status(400).json({ success: false, error: 'INVALID_PRODUCT_ECONOMICS' });
  }
  const economics = input as unknown as ProductEconomics;
  const margin = calculateMargin(economics);
  if (!margin.valid) {
    return res.status(400).json({ success: false, error: 'INVALID_PRODUCT_ECONOMICS', reasons: margin.reasons });
  }
  try {
    const existing = await prisma.dropshippingProductCandidate.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, error: 'PRODUCT_CANDIDATE_NOT_FOUND' });
    let blockers: string[] = [];
    try {
      blockers = existing.blockers ? JSON.parse(existing.blockers) as string[] : [];
      if (!Array.isArray(blockers)) blockers = [];
    } catch {
      blockers = [];
    }
    blockers = blockers.filter((item) => !item.startsWith('Margem estimada nula ou negativa'));
    if (margin.estimatedProfit <= 0) {
      blockers.push('Margem estimada nula ou negativa; rever custos antes de testar.');
    }
    blockers = [...new Set(blockers)];
    const candidateForTesting = blockers.length === 0;
    const status = blockers.length ? 'REJECT' : existing.suitabilityScore >= 60 ? 'TEST' : 'WATCH';
    const updated = await prisma.dropshippingProductCandidate.update({
      where: { id },
      data: {
        salePrice: economics.salePrice,
        supplierCost: economics.supplierCost,
        marketplaceFeeRatePct: economics.marketplaceFeeRatePct,
        fixedMarketplaceFee: economics.fixedMarketplaceFee,
        shippingCost: economics.shippingCost,
        taxRatePct: economics.taxRatePct,
        packagingCost: economics.packagingCost ?? null,
        returnReserveRatePct: economics.returnReserveRatePct ?? null,
        otherVariableCosts: economics.otherVariableCosts ?? null,
        estimatedProfit: margin.estimatedProfit,
        marginPct: margin.marginPct,
        breakEvenPrice: margin.breakEvenPrice,
        candidateForTesting,
        status,
        blockers: JSON.stringify(blockers),
      },
    });
    const alertTitle = 'Margem não positiva: ' + existing.title;
    const openAlert = await prisma.dropshippingAlert.findFirst({
      where: { type: 'PRODUCT_MARGIN', title: alertTitle, status: 'OPEN' },
      select: { id: true },
    });
    if (margin.estimatedProfit <= 0) {
      const alertData = {
        severity: 'WARNING',
        message: 'Lucro estimado de R$ ' + margin.estimatedProfit.toFixed(2) + '. Não testar até rever preço, taxas e custos.',
        payload: JSON.stringify({ candidateId: id, estimatedProfit: margin.estimatedProfit, marginPct: margin.marginPct }),
      };
      if (openAlert) await prisma.dropshippingAlert.update({ where: { id: openAlert.id }, data: alertData });
      else await prisma.dropshippingAlert.create({ data: { type: 'PRODUCT_MARGIN', title: alertTitle, ...alertData } });
    } else if (openAlert) {
      await prisma.dropshippingAlert.update({
        where: { id: openAlert.id },
        data: { status: 'RESOLVED', resolvedAt: new Date() },
      });
    }
    return res.json({
      success: true,
      candidate: {
        id: updated.id,
        title: updated.title,
        status: updated.status,
        candidateForTesting: updated.candidateForTesting,
        estimatedProfit: updated.estimatedProfit,
        marginPct: updated.marginPct,
        breakEvenPrice: updated.breakEvenPrice,
        blockers,
      },
      margin,
      note: 'Margem estimada atualizada. Lucro calculado depende da precisão dos custos e taxas informados.',
    });
  } catch {
    return res.status(500).json({ success: false, error: 'PRODUCT_ECONOMICS_UPDATE_FAILED' });
  }
}

export async function getDropshippingDashboardSummary(req: Request, res: Response): Promise<Response> {
  try {
    const [
      totalProducts, watchProducts, testProducts, rejectedProducts, scaleProducts, championProducts,
      productsMissingEconomics, productsNonPositiveMargin, totalSuppliers, pendingSuppliers,
      validatedSuppliers, rejectedSuppliers, openAlerts, latestResearch, topProducts,
    ] = await Promise.all([
      prisma.dropshippingProductCandidate.count(),
      prisma.dropshippingProductCandidate.count({ where: { status: 'WATCH' } }),
      prisma.dropshippingProductCandidate.count({ where: { status: 'TEST' } }),
      prisma.dropshippingProductCandidate.count({ where: { status: 'REJECT' } }),
      prisma.dropshippingProductCandidate.count({ where: { status: 'SCALE' } }),
      prisma.dropshippingProductCandidate.count({ where: { status: 'CHAMPION' } }),
      prisma.dropshippingProductCandidate.count({ where: { estimatedProfit: null } }),
      prisma.dropshippingProductCandidate.count({ where: { estimatedProfit: { lte: 0 } } }),
      prisma.dropshippingSupplierCandidate.count(),
      prisma.dropshippingSupplierCandidate.count({ where: { validationStatus: 'PENDING_VALIDATION' } }),
      prisma.dropshippingSupplierCandidate.count({ where: { validationStatus: 'VALIDATED' } }),
      prisma.dropshippingSupplierCandidate.count({ where: { validationStatus: 'REJECTED' } }),
      prisma.dropshippingAlert.count({ where: { status: 'OPEN' } }),
      prisma.dropshippingResearchRun.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { id: true, query: true, collectedAt: true, totalResults: true, resultCount: true },
      }),
      prisma.dropshippingProductCandidate.findMany({
        take: 10,
        orderBy: [{ suitabilityScore: 'desc' }, { createdAt: 'desc' }],
        select: {
          id: true, title: true, marketplace: true, status: true, suitabilityScore: true,
          observedPrice: true, estimatedProfit: true, marginPct: true, externalId: true,
          candidateForTesting: true, createdAt: true,
        },
      }),
    ]);
    return res.json({
      success: true,
      generatedAt: new Date().toISOString(),
      products: {
        total: totalProducts,
        watch: watchProducts,
        test: testProducts,
        scale: scaleProducts,
        champion: championProducts,
        rejected: rejectedProducts,
        missingEconomics: productsMissingEconomics,
        nonPositiveMargin: productsNonPositiveMargin,
        topCandidates: topProducts,
      },
      suppliers: {
        total: totalSuppliers,
        pendingValidation: pendingSuppliers,
        validated: validatedSuppliers,
        rejected: rejectedSuppliers,
      },
      openAlerts,
      latestResearch,
      note: 'Scores e margens são sinais de triagem baseados nos dados disponíveis, não garantias de vendas ou lucro.',
    });
  } catch {
    return res.status(500).json({ success: false, error: 'DROPSHIPPING_DASHBOARD_SUMMARY_ERROR' });
  }
}
