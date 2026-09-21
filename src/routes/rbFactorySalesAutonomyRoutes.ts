import { Router } from 'express';
import { rbFactorySalesAutonomyController } from '../controllers/rbFactorySalesAutonomyController';
import { adminAuthorization } from '../middlewares/security';

const router=Router();
router.use(adminAuthorization);
router.get('/config',rbFactorySalesAutonomyController.config);
router.post('/cycle',rbFactorySalesAutonomyController.cycle);
router.get('/history',rbFactorySalesAutonomyController.history);
export default router;
