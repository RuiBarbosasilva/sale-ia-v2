import { Router } from 'express';
import { rbFactoryWhatsAppController } from '../controllers/rbFactoryWhatsAppController';

const router=Router();
router.post('/webhook',rbFactoryWhatsAppController.webhook);
export default router;
