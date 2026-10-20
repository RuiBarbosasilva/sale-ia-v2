import { prisma } from '../../modules/mercadoLivre/lib/prisma';

export interface SupplierData {
  name: string;
  site?: string;
  cnpj?: string;
  contact?: string;
  allowsDropshipping?: boolean;
  emitsNF?: boolean;
  hasTracking?: boolean;
  neutralPackaging?: boolean;
}

export class SupplierHunterService {
  
  // Calcula o score de confiabilidade baseado em evid?ncias reais (0-100)
  calculateReliabilityScore(data: Partial<SupplierData>): { score: number; classification: string; reasons: string[] } {
    let score = 0;
    const reasons: string[] = [];

    if (data.site) { score += 15; reasons.push('Site acess?vel'); }
    if (data.cnpj) { score += 20; reasons.push('CNPJ informado'); }
    if (data.contact) { score += 10; reasons.push('Canal de contato dispon?vel'); }
    if (data.allowsDropshipping) { score += 20; reasons.push('Permite dropshipping (declarado)'); }
    if (data.emitsNF) { score += 15; reasons.push('Emite Nota Fiscal'); }
    if (data.hasTracking) { score += 10; reasons.push('Fornece c?digo de rastreio'); }
    if (data.neutralPackaging) { score += 10; reasons.push('Embalagem neutra dispon?vel'); }

    let classification = 'N?O RECOMENDADO';
    if (score >= 80) classification = 'CONFI?VEL';
    else if (score >= 60) classification = 'ACEIT?VEL (Requer Aten??o)';
    else if (score >= 40) classification = 'RISCO';

    return { score, classification, reasons };
  }

  async registerSupplier(data: SupplierData & { categories?: string }) {
    const validation = this.calculateReliabilityScore(data);
    
    const supplier = await prisma.dropshipSupplier.create({
      data: {
        name: data.name,
        site: data.site || null,
        cnpj: data.cnpj || null,
        contact: data.contact || null,
        categories: data.categories || null,
        allowsDropshipping: data.allowsDropshipping || false,
        emitsNF: data.emitsNF || false,
        hasTracking: data.hasTracking || false,
        neutralPackaging: data.neutralPackaging || false,
        reliabilityScore: validation.score,
        scoreReason: validation.reasons.join(', '),
        validationStatus: validation.score >= 60 ? 'CONDITIONALLY_VALIDATED' : 'PENDING_VALIDATION',
        lastValidation: new Date()
      }
    });

    // Criar registro de valida??o inicial
    await prisma.dropshipSupplierValidation.create({
      data: {
        supplierId: supplier.id,
        checklist: JSON.stringify({
          site: !!data.site,
          cnpj: !!data.cnpj,
          dropshipping: data.allowsDropshipping,
          nf: data.emitsNF,
          tracking: data.hasTracking
        }),
        status: supplier.validationStatus,
        notes: 'Valida??o inicial autom?tica baseada nos dados fornecidos.'
      }
    });

    return { supplier, validation };
  }

  async getValidatedSuppliers() {
    return await prisma.dropshipSupplier.findMany({
      where: { validationStatus: { in: ['VALIDATED', 'CONDITIONALLY_VALIDATED'] } },
      orderBy: { reliabilityScore: 'desc' }
    });
  }

  async getPendingValidation() {
    return await prisma.dropshipSupplier.findMany({
      where: { validationStatus: 'PENDING_VALIDATION' },
      include: { validations: true }
    });
  }
}

export const supplierHunterService = new SupplierHunterService();
