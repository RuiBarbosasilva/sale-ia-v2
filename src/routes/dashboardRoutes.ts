// src/routes/dashboardRoutes.ts
import { Router } from 'express';
import { getMercadoLivreDashboard } from '../controllers/dashboardController';
import { fetchMLMetrics } from '../modules/mercadoLivre/controllers/metricsController';
import { affiliateIntelligenceService } from '../services/affiliateIntelligenceService';
import { hunterService } from '../services/hunterService';
import { salesOrchestrationService } from '../services/salesOrchestrationService';
import { opportunitySalesBridgeService } from '../services/opportunitySalesBridgeService';
import { prisma } from '../modules/mercadoLivre/lib/prisma';
import { adminAuthorization } from '../middlewares/security';

const router = Router();

router.get('/mercadolivre', adminAuthorization,, getMercadoLivreDashboard);

router.get('/overview', adminAuthorization, async (_req, res) => {
  try {
    const metrics = await fetchMLMetrics();

    if (!metrics) {
      return res.status(404).json({
        success: false,
        message: 'Nenhuma conta Mercado Livre conectada'
      });
    }

    res.json({
      success: true,
      data: {
        account: metrics.account,
        items: metrics.items,
        orders: metrics.orders,
        lastSync: metrics.lastSync,
        totalRevenue: metrics.orders.revenue,
        totalItems: metrics.items.total,
        totalOrders: metrics.orders.total
      }
    });
  } catch (error) {
    console.error('[Dashboard] Erro ao buscar overview:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao carregar métricas do dashboard'
    });
  }
});

router.get('/operations', adminAuthorization, async (_req, res) => {
  const safe = async <T>(label:string, fn:()=>Promise<T>, fallback:T):Promise<T> => {
    try { return await fn(); }
    catch (error) {
      console.warn('[Dashboard] Falha em', label, error);
      return fallback;
    }
  };

  const [affiliates, affiliateProducts, affiliateOpportunities, hunter, sales, plans, editorialProjects] = await Promise.all([
    safe('affiliate networks', async()=> (await affiliateIntelligenceService.listNetworks()).length, 0),
    safe('affiliate products', async()=> (await affiliateIntelligenceService.topProducts(200)).length, 0),
    safe('affiliate opportunities', async()=> (await affiliateIntelligenceService.opportunities()).length, 0),
    safe('hunter', ()=>hunterService.dashboard(), {opportunities:0,suppliers:0,products:0,mode:'UNAVAILABLE'}),
    safe('sales', ()=>salesOrchestrationService.analytics(), {funnel:{openConversations:0,hotLeads:0,pendingActions:0,pendingFollowUps:0},offers:0,activeExperiments:0,metrics:[]}),
    safe('opportunity plans', async()=> (await opportunitySalesBridgeService.plans()).length, 0),
    safe('editorial projects', async()=> prisma.editorialProject.count(), 0)
  ]);

  return res.json({
    success:true,
    data:{
      affiliates:{networks:affiliates,products:affiliateProducts,opportunities:affiliateOpportunities},
      hunter,
      sales,
      opportunityPlans:plans,
      editorial:{projects:editorialProjects}
    }
  });
});

export default router;
