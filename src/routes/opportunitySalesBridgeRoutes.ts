import { Router } from 'express';
import { adminAuthorization } from '../middlewares/security';
import { opportunitySalesBridgeController } from '../controllers/opportunitySalesBridgeController';

const router=Router();
router.use(adminAuthorization);

router.get('/plans', opportunitySalesBridgeController.plans);
router.post('/opportunities/:opportunityId/build', opportunitySalesBridgeController.build);
router.post('/plans/:planId/approve', opportunitySalesBridgeController.approve);
router.post('/plans/:planId/reject', opportunitySalesBridgeController.reject);

export default router;
