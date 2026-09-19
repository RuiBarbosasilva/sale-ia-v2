import { Router } from 'express';
import { affiliateController } from '../controllers/affiliateController';

const router = Router();
router.get('/:code', affiliateController.redirect);
export default router;
