import { Router } from 'express';
import { rbFactorySalesController } from '../controllers/rbFactorySalesController';
const router=Router();
router.get('/pipeline',rbFactorySalesController.list);
router.post('/pipeline/prospect/:prospectId',rbFactorySalesController.create);
router.post('/pipeline/prospect/:prospectId/demo',rbFactorySalesController.demo);
router.post('/pipeline/prospect/:prospectId/proposal',rbFactorySalesController.proposal);
router.patch('/pipeline/:id/stage',rbFactorySalesController.stage);
export default router;
