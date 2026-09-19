import {Router} from 'express'; import {rbFactoryBenchmarkController} from '../controllers/rbFactoryBenchmarkController';
const router=Router(); router.get('/catalog',rbFactoryBenchmarkController.catalog); router.get('/demos/:niche/:index',rbFactoryBenchmarkController.demo); export default router;
