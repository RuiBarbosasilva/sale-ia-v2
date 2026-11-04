import { Router } from 'express';
import { adminAuthorization } from '../middlewares/security';
import { contentFactoryController } from '../controllers/contentFactory.controller';

const router = Router();
router.use(adminAuthorization);

router.post('/generate-one', contentFactoryController.generateOne);
router.post('/generate-latest', contentFactoryController.generateLatest);

export default router;
