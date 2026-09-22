import { Router } from 'express';
import { adminAuthorization } from '../middlewares/security';
import { rbFactorySiteMaintenanceController } from '../controllers/rbFactorySiteMaintenanceController';

const router = Router();

router.use(adminAuthorization);
router.get('/clients', rbFactorySiteMaintenanceController.list);
router.post('/clients/from-project', rbFactorySiteMaintenanceController.createFromProject);
router.get('/clients/:id', rbFactorySiteMaintenanceController.details);
router.post('/clients/:id/change-requests', rbFactorySiteMaintenanceController.createChangeRequest);
router.post('/clients/:id/change-requests/:requestId/apply', rbFactorySiteMaintenanceController.applyChangeRequest);
router.post('/suggestions/generate-due', rbFactorySiteMaintenanceController.generateDueSuggestions);
router.post('/suggestions/:id/sent', rbFactorySiteMaintenanceController.markSuggestionSent);

export default router;
