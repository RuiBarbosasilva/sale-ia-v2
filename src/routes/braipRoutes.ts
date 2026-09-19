import { Router } from 'express';
import { braipController } from '../controllers/braipController';
const router=Router();
router.get('/status',braipController.status);
router.post('/products/import',braipController.importProducts);
export default router;