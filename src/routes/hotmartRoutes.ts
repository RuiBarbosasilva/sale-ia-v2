import {Router} from 'express';
import {adminAuthorization} from '../middlewares/security';
import {hotmartController} from '../controllers/hotmartController';

const router=Router();
router.use(adminAuthorization);
router.get('/test',hotmartController.test);
router.get('/products',hotmartController.products);
router.get('/sales',hotmartController.sales);
export default router;
