import { Router } from 'express';
import { adminAuthorization } from '../middlewares/security';
import { salesOrchestrationController } from '../controllers/salesOrchestrationController';

const router=Router();
router.use(adminAuthorization);
router.get('/analytics',salesOrchestrationController.analytics);
router.get('/offers',salesOrchestrationController.offers);
router.post('/offers',salesOrchestrationController.createOffer);
router.get('/experiments',salesOrchestrationController.experiments);
router.post('/experiments',salesOrchestrationController.createExperiment);
router.post('/metrics',salesOrchestrationController.recordMetric);
router.get('/follow-ups/due',salesOrchestrationController.dueFollowUps);
router.patch('/follow-ups/:id',salesOrchestrationController.markFollowUp);
export default router;
