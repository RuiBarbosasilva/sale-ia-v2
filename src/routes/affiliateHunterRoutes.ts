import { Router } from 'express';
import { affiliateHunterController } from '../controllers/affiliateHunter.controller';

export const affiliateHunterRoutes = Router();

affiliateHunterRoutes.post('/sync-ml', affiliateHunterController.syncMl);
affiliateHunterRoutes.post('/sync-all', affiliateHunterController.syncAll);
