import { Router } from 'express';
import { affiliateController } from '../controllers/affiliate.controller';

const router = Router();

// Rota para adicionar produtos do ML via URL
router.post('/ml/add-urls', affiliateController.addFromUrls);

export default router;