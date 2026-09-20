import { Router } from 'express';
import { rbFactorySalesAgentController } from '../controllers/rbFactorySalesAgentController';
import { adminAuthorization } from '../middlewares/security';
const router=Router();
router.use(adminAuthorization);
router.get('/dashboard',rbFactorySalesAgentController.dashboard);
router.post('/prospect/:prospectId/conversations',rbFactorySalesAgentController.create);
router.post('/prospect/:prospectId/conversations/:conversationId/respond',rbFactorySalesAgentController.respond);
export default router;
