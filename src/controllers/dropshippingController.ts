import { supplierHunterService } from '../services/dropshipping/supplierHunter.service';
import { Request, Response } from 'express';
import { prisma } from '../modules/mercadoLivre/lib/prisma';
import { dropshippingIntelligenceService } from '../services/dropshipping/dropshippingIntelligence.service';
import { mercadoLivreTrendHunterService } from '../services/dropshipping/mercadoLivreTrendHunter.service';

export const dropshippingController = {
  
  async dashboard(req: Request, res: Response) {
    try {
      const data = await dropshippingIntelligenceService.getDashboardData();
      return res.json({ success: true, data });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  async listProducts(req: Request, res: Response) {
    try {
      const { classification, status, limit = 50 } = req.query;
      const where: any = {};
      if (classification) where.classification = classification;
      if (status) where.status = status;

      const products = await prisma.dropshipProduct.findMany({
        where,
        include: { supplier: true },
        orderBy: { opportunityScore: 'desc' },
        take: Number(limit)
      });

      return res.json({ success: true, products });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  async getProduct(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const product = await prisma.dropshipProduct.findUnique({
        where: { id },
        include: { 
          supplier: true,
          scores: true,
          priceSnapshots: { orderBy: { capturedAt: 'desc' }, take: 10 },
          tests: true,
          performances: { orderBy: { recordedAt: 'desc' }, take: 10 }
        }
      });

      if (!product) {
        return res.status(404).json({ success: false, error: 'Produto nÃ£o encontrado' });
      }

      return res.json({ success: true, product });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  async getSupplier(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const supplier = await prisma.dropshipSupplier.findUnique({ where: { id } });

      if (!supplier) {
        return res.status(404).json({ success: false, error: 'Fornecedor não encontrado' });
      }

      return res.json({ success: true, supplier });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  },
  async listSuppliers(req: Request, res: Response) {
    try {
      const { validationStatus, limit = 50 } = req.query;
      const where: any = {};
      if (validationStatus) where.validationStatus = validationStatus;

      const suppliers = await prisma.dropshipSupplier.findMany({
        where,
        orderBy: { reliabilityScore: 'desc' },
        take: Number(limit)
      });

      return res.json({ success: true, suppliers });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  async createSupplier(req: Request, res: Response) {
    try {
      const data = req.body;
      const supplier = await prisma.dropshipSupplier.create({ data });
      return res.status(201).json({ success: true, supplier });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  async validateSupplier(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { checklist, status, notes } = req.body;

      const supplier = await prisma.dropshipSupplier.findUnique({ where: { id } });
      if (!supplier) {
        return res.status(404).json({ success: false, error: 'Fornecedor nÃ£o encontrado' });
      }

      const scoreResult = dropshippingIntelligenceService.calculateSupplierReliabilityScore({
        hasSite: !!supplier.site,
        hasCatalog: true,
        hasCNPJ: !!supplier.cnpj,
        hasShippingPolicy: !!supplier.shippingDays,
        hasReturnPolicy: !!supplier.returnPolicy,
        emitsNF: supplier.emitsNF,
        hasTracking: supplier.hasTracking,
        hasStock: supplier.productCount > 0,
        shippingDays: supplier.shippingDays || undefined,
        marketplaceCompatible: !!supplier.marketplaceCompatible,
        allowsDropshipping: supplier.directShipping,
        hasGoodPackaging: supplier.neutralPackaging,
        hasContact: !!supplier.contact,
        hasReputation: !!supplier.reputation
      });

      await prisma.dropshipSupplier.update({
        where: { id },
        data: {
          reliabilityScore: scoreResult.score,
          scoreReason: scoreResult.reasons.join(', '),
          validationStatus: status || 'VALIDATED',
          lastValidation: new Date()
        }
      });

      await prisma.dropshipSupplierValidation.create({
        data: {
          supplierId: id,
          checklist: JSON.stringify(checklist),
          status: status || 'VALIDATED',
          validatedAt: new Date(),
          notes
        }
      });

      return res.json({ 
        success: true, 
        message: 'Fornecedor validado',
        score: scoreResult
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  async createProduct(req: Request, res: Response) {
    try {
      const data = req.body;
      
      if (!data.supplierId) {
        return res.status(400).json({ success: false, error: 'supplierId Ã© obrigatÃ³rio' });
      }

      const product = await prisma.dropshipProduct.create({
        data: {
          ...data,
          status: 'CANDIDATE'
        }
      });

      const classification = await dropshippingIntelligenceService.classifyProduct(product.id);

      return res.status(201).json({ 
        success: true, 
        product,
        classification
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  async calculateMargin(req: Request, res: Response) {
    try {
      const result = dropshippingIntelligenceService.calculateMargin(req.body);
      return res.json({ success: true, calculation: result });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  async simulateScenarios(req: Request, res: Response) {
    try {
      const result = dropshippingIntelligenceService.simulateScenarios(req.body);
      return res.json({ success: true, scenarios: result });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  async getChampions(req: Request, res: Response) {
    try {
      const products = await prisma.dropshipProduct.findMany({
        where: { classification: 'CHAMPION' },
        include: { supplier: true },
        orderBy: { opportunityScore: 'desc' },
        take: 20
      });

      return res.json({ success: true, products });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  async getScalable(req: Request, res: Response) {
    try {
      const products = await prisma.dropshipProduct.findMany({
        where: { classification: 'SCALE' },
        include: { supplier: true },
        orderBy: { opportunityScore: 'desc' },
        take: 20
      });

      return res.json({ success: true, products });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  async generateListing(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const product = await prisma.dropshipProduct.findUnique({
        where: { id },
        include: { supplier: true }
      });

      if (!product) {
        return res.status(404).json({ success: false, error: 'Produto nÃ£o encontrado' });
      }

      const listing = dropshippingIntelligenceService.generateListing(product);

      return res.json({ success: true, listing });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  async listOrders(req: Request, res: Response) {
    try {
      const { status, limit = 50 } = req.query;
      const where: any = {};
      if (status) where.status = status;

      const orders = await prisma.dropshipOrder.findMany({
        where,
        include: { product: true, supplier: true },
        orderBy: { createdAt: 'desc' },
        take: Number(limit)
      });

      return res.json({ success: true, orders });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  async listAlerts(req: Request, res: Response) {
    try {
      const { isRead, limit = 50 } = req.query;
      const where: any = {};
      if (isRead !== undefined) where.isRead = isRead === 'true';

      const alerts = await prisma.dropshipAlert.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Number(limit)
      });

      return res.json({ success: true, alerts });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  async getRecommendations(req: Request, res: Response) {
    try {
      const recommendations = await prisma.dropshipRecommendation.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20
      });

      return res.json({ success: true, recommendations });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  },
  async collectTrends(req: Request, res: Response) {
    try {
      const result = await mercadoLivreTrendHunterService.collectAndSave();
      return res.json({ success: true, message: 'Tendencias coletadas', data: result });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  async getLatestTrends(req: Request, res: Response) {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const trends = await mercadoLivreTrendHunterService.getLatest(limit);
      return res.json({ success: true, trends });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  async getTrendStats(req: Request, res: Response) {
    try {
      const stats = await mercadoLivreTrendHunterService.getStats();
      return res.json({ success: true, stats });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  async registerSupplier(req: Request, res: Response) {
    try {
      const result = await supplierHunterService.registerSupplier(req.body);
      return res.status(201).json({ success: true, data: result });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  },

  async getValidatedSuppliers(req: Request, res: Response) {
    try {
      const suppliers = await supplierHunterService.getValidatedSuppliers();
      return res.json({ success: true, suppliers });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

};
