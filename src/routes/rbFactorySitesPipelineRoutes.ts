import { Router } from 'express';
import { adminAuthorization } from '../middlewares/security';
import { rbFactorySitesPipelineController } from '../controllers/rbFactorySitesPipelineController';

const router = Router();
router.use(adminAuthorization);
router.post('/start', rbFactorySitesPipelineController.start);
router.post('/demos/:demoId/approve-publish', rbFactorySitesPipelineController.approveAndPublish);

export default router;
