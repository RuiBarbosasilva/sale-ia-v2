// src/routes/dashboardRoutes.ts
import { Router } from 'express';
import { getMercadoLivreDashboard } from '../controllers/dashboardController';
import { fetchMLMetrics } from '../modules/mercadoLivre/controllers/metricsController';
import { affiliateIntelligenceService } from '../services/affiliateIntelligenceService';
import { hunterService } from '../services/hunterService';
import { salesOrchestrationService } from '../services/salesOrchestrationService';
import { opportunitySalesBridgeService } from '../services/opportunitySalesBridgeService';
import { rbFactorySalesService } from '../services/rbFactorySalesService';
import { prisma } from '../modules/mercadoLivre/lib/prisma';
import { adminAuthorization } from '../middlewares/security';

const router = Router();

router.get('/mercadolivre', adminAuthorization, getMercadoLivreDashboard);

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
  type Check<T> = { ok: boolean; value: T };
  const check = async <T>(label: string, fn: () => Promise<T>, fallback: T): Promise<Check<T>> => {
    try {
      return { ok: true, value: await fn() };
    } catch (error) {
      console.warn('[Dashboard] Falha em', label, error);
      return { ok: false, value: fallback };
    }
  };

  const [rbFactory, affiliates, affiliateProducts, affiliateOpportunities, hunter, sales, plans, editorialProjects] = await Promise.all([
    check('rb factory pipeline', async () => (await rbFactorySalesService.list()).length, 0),
    check('affiliate networks', async () => (await affiliateIntelligenceService.listNetworks()).length, 0),
    check('affiliate products', async () => (await affiliateIntelligenceService.topProducts(200)).length, 0),
    check('affiliate opportunities', async () => (await affiliateIntelligenceService.opportunities()).length, 0),
    check('hunter', () => hunterService.dashboard(), { opportunities: 0, suppliers: 0, products: 0, mode: 'UNAVAILABLE' }),
    check('sales', () => salesOrchestrationService.analytics(), {
      funnel: { openConversations: 0, hotLeads: 0, pendingActions: 0, pendingFollowUps: 0 },
      offers: 0,
      activeExperiments: 0,
      metrics: []
    }),
    check('opportunity plans', async () => (await opportunitySalesBridgeService.plans()).length, 0),
    check('editorial projects', async () => prisma.editorialProject.count(), 0)
  ]);

  const affiliateChecks = [affiliates.ok, affiliateProducts.ok, affiliateOpportunities.ok];
  const rbFactoryScore = rbFactory.ok ? 100 : 0;
  const affiliateScore = Math.round((affiliateChecks.filter(Boolean).length / affiliateChecks.length) * 100);
  const hunterScore = hunter.ok ? 100 : 0;
  const salesScore = sales.ok ? 100 : 0;
  const plansScore = plans.ok ? 100 : 0;
  const editorialScore = editorialProjects.ok ? 100 : 0;

  const modules = [
    { id: 'rb-factory', name: 'RB Factory Sites', score: rbFactoryScore, status: rbFactoryScore === 100 ? 'OPERACIONAL' : 'INDISPONIVEL', href: '/rb-factory' },
    { id: 'afiliados', name: 'Afiliados & IA', score: affiliateScore, status: affiliateScore === 100 ? 'OPERACIONAL' : affiliateScore > 0 ? 'PARCIAL' : 'INDISPONIVEL', href: '/affiliates/intelligence' },
    { id: 'hunter', name: 'Hunter', score: hunterScore, status: hunterScore === 100 ? 'OPERACIONAL' : 'INDISPONIVEL', href: '/api/hunter/opportunities' },
    { id: 'sales', name: 'Sales Agent', score: salesScore, status: salesScore === 100 ? 'OPERACIONAL' : 'INDISPONIVEL', href: '/sales' },
    { id: 'editorial', name: 'Editorial Factory', score: editorialScore, status: editorialScore === 100 ? 'OPERACIONAL' : 'INDISPONIVEL', href: '/editorial' },
    { id: 'plans', name: 'Planos de oportunidade', score: plansScore, status: plansScore === 100 ? 'OPERACIONAL' : 'INDISPONIVEL', href: '/api/opportunity-sales/plans' }
  ];

  const overallScore = Math.round(modules.reduce((sum, module) => sum + module.score, 0) / modules.length);

  const projectCompleteness = {
    score: 76,
    label: 'COMPLETUDE DO ECOSSISTEMA',
    definition: 'Índice de implementação do SALE-IA-V2 por módulos e capacidades planejadas. É independente da saúde operacional.',
    modules: [
      { id: 'core', name: 'Núcleo / infraestrutura', weight: 10, score: 100 },
      { id: 'rb-factory', name: 'RB Factory Sites', weight: 15, score: 90 },
      { id: 'afiliados', name: 'Afiliados + IA', weight: 15, score: 50 },
      { id: 'sales', name: 'Senior Sales Agent', weight: 10, score: 85 },
      { id: 'hunter', name: 'Hunter / Oportunidades', weight: 10, score: 90 },
      { id: 'editorial', name: 'Editorial / E-book', weight: 10, score: 75 },
      { id: 'mercadolivre', name: 'Mercado Livre', weight: 10, score: 75 },
      { id: 'autonomy', name: 'Automações / autonomia', weight: 10, score: 50 },
      { id: 'dashboard', name: 'Dashboards / operação', weight: 5, score: 95 },
      { id: 'production', name: 'Produção / segurança / integrações', weight: 5, score: 55 }
    ]
  };


  return res.json({
    success: true,
    data: {
      overallScore,
      definition: 'Percentual de saúde operacional dos módulos consultados; não representa percentual de implementação do projeto.',
      projectCompleteness,
      modules,
      affiliates: {
        networks: affiliates.value,
        products: affiliateProducts.value,
        opportunities: affiliateOpportunities.value
      },
      hunter: hunter.value,
      sales: sales.value,
      opportunityPlans: plans.value,
      editorial: { projects: editorialProjects.value }
    }
  });
});

export default router;
