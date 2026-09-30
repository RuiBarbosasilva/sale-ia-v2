import { Router } from 'express';
import { mlSellerController } from '../controllers/mlSeller.controller';

const router = Router();

router.post('/create-listing', mlSellerController.createListing);

export default router;
