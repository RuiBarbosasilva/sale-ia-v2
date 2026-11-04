import { Router } from 'express';
import { obterMetricasCompletas, servirDashboardHTML } from './dashboard.controller';
import { adminAuthorization } from '../../middlewares/security';

export const dashboardRoutes = Router();
dashboardRoutes.get('/', servirDashboardHTML);
dashboardRoutes.get('/api/metricas', adminAuthorization, obterMetricasCompletas);
