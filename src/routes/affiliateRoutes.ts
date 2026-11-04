import { Router } from 'express';
import { adminAuthorization } from '../middlewares/security';
import { affiliateController } from '../controllers/affiliate.controller';

const router = Router();
router.use(adminAuthorization);

// Rota para adicionar produtos do ML via URL
router.post('/ml/add-urls', affiliateController.addFromUrls);

export default router;