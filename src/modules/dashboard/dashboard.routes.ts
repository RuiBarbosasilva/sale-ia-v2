import { Router } from 'express';
import { obterMetricasCompletas, servirDashboardHTML } from './dashboard.controller';

export const dashboardRoutes = Router();
dashboardRoutes.get('/', servirDashboardHTML);
dashboardRoutes.get('/api/metricas', obterMetricasCompletas);
