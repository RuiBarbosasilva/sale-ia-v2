import { Router } from 'express';
import { rbFactoryWhatsAppController } from '../controllers/rbFactoryWhatsAppController';
import { adminAuthorization } from '../middlewares/security';

const router=Router();
router.post('/webhook',rbFactoryWhatsAppController.webhook);
export default router;
