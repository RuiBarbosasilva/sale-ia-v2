import { Router } from 'express';
import { rbFactorySalesAutonomyController } from '../controllers/rbFactorySalesAutonomyController';
import { adminAuthorization } from '../middlewares/security';

const router=Router();
router.use(adminAuthorization);
router.get('/status',rbFactorySalesAutonomyController.status);
router.post('/start',rbFactorySalesAutonomyController.start);
router.post('/stop',rbFactorySalesAutonomyController.stop);
router.get('/config',rbFactorySalesAutonomyController.config);
router.post('/cycle',rbFactorySalesAutonomyController.cycle);
router.get('/alerts',rbFactorySalesAutonomyController.alerts);
router.post('/alerts/:alertId/acknowledge',rbFactorySalesAutonomyController.acknowledgeAlert);
router.get('/history',rbFactorySalesAutonomyController.history);
export default router;
