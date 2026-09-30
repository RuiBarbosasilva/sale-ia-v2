import { Router } from 'express';
import { contentFactoryController } from '../controllers/contentFactory.controller';

const router = Router();

router.post('/generate-one', contentFactoryController.generateOne);
router.post('/generate-latest', contentFactoryController.generateLatest);

export default router;
