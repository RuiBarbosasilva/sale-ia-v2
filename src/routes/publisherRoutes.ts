import { Router } from 'express';
import { publisherController } from '../controllers/publisher.controller';

const router = Router();

router.get('/pinterest/boards', publisherController.listBoards);
router.post('/pinterest/pin', publisherController.createPin);

export default router;
