import { Router } from 'express';
import { adminAuthorization } from '../middlewares/security';
import { mlSellerController } from '../controllers/mlSeller.controller';

const router = Router();
router.use(adminAuthorization);

router.post('/create-listing', mlSellerController.createListing);

export default router;
