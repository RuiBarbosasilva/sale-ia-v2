import { Router } from 'express';
import { affiliateController } from '../controllers/affiliateController';

const router = Router();

router.get('/health', affiliateController.health);
router.post('/register', affiliateController.register);

router.get('/portal', affiliateController.portal);
router.get('/portal/links', affiliateController.portalLinks);
router.post('/portal/links', affiliateController.createPortalLink);
router.post('/portal/payouts', affiliateController.requestPayout);

router.get('/admin', affiliateController.adminList);
router.get('/admin/stats', affiliateController.stats);
router.get('/admin/:id', affiliateController.adminGet);
router.patch('/admin/:id', affiliateController.adminUpdate);

router.get('/admin/offers', affiliateController.offers);
router.post('/admin/offers', affiliateController.createOffer);
router.get('/admin/links', affiliateController.links);
router.post('/admin/links', affiliateController.createLink);
router.post('/admin/sales', affiliateController.recordSale);
router.patch('/admin/sales/:id/status', affiliateController.saleStatus);

router.post('/webhook/sale', affiliateController.webhookSale);

export default router;
