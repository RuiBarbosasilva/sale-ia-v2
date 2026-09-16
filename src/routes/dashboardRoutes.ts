// src/routes/dashboardRoutes.ts
import { Router } from 'express';
import { getMercadoLivreDashboard } from '../controllers/dashboardController';
import { fetchMLMetrics } from '../modules/mercadoLivre/controllers/metricsController';

const router = Router();

// --- DASHBOARD MERCADO LIVRE (HTML) ---
router.get('/mercadolivre', getMercadoLivreDashboard);

// --- MÉTRICAS GERAIS DO DASHBOARD (JSON) ---
router.get('/overview', async (req, res) => {
  try {
    const metrics = await fetchMLMetrics();

    if (!metrics) {
      return res.status(404).json({
        success: false,
        message: 'Nenhuma conta Mercado Livre conectada'
      });
    }

    // Retornar métricas no formato que o frontend espera
    res.json({
      success: true,
      data: {
        account: metrics.account,
        items: metrics.items,
        orders: metrics.orders,
        lastSync: metrics.lastSync,
        // Campos agregados para compatibilidade
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

export default router;
