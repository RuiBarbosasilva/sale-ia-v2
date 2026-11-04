import { Router } from 'express';
import { adminAuthorization } from '../middlewares/security';
import { affiliateSalesStrategyController as c } from '../controllers/affiliateSalesStrategyController';

const router = Router();
router.use(adminAuthorization);

router.get('/portfolio', c.portfolio);
router.get('/networks/:id/playbook', c.networkPlaybook);
router.get('/products/:id/strategy', c.productStrategy);

export default router;
