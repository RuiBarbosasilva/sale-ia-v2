import { Request, Response } from 'express';
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
