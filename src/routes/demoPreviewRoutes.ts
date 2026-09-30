import { Router } from 'express';
import { demoPreviewController } from '../controllers/demoPreviewController';

const router = Router();

router.get('/preview/:id', demoPreviewController.preview);
router.get('/list', demoPreviewController.list);

export default router;
