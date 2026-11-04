import { Router } from 'express';
import { adminAuthorization } from '../middlewares/security';
import { publisherController } from '../controllers/publisher.controller';

const router = Router();
router.use(adminAuthorization);

router.get('/pinterest/boards', publisherController.listBoards);
router.post('/pinterest/pin', publisherController.createPin);

export default router;
