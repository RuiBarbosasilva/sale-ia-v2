import {Router} from 'express';
import {hotmartController} from '../controllers/hotmartController';

const router=Router();
router.get('/test',hotmartController.test);
router.get('/products',hotmartController.products);
router.get('/sales',hotmartController.sales);
export default router;
