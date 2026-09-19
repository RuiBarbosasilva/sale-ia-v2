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
router.get('/admin/payouts', affiliateController.payouts);
router.patch('/admin/payouts/:id/status', affiliateController.payoutStatus);
router.get('/admin/sales', affiliateController.sales);
router.get('/admin/:id', affiliateController.adminGet);
router.patch('/admin/:id', affiliateController.adminUpdate);
router.post('/admin/:id/rotate-token', affiliateController.adminRotateToken);

router.get('/admin/offers', affiliateController.offers);
router.post('/admin/offers', affiliateController.createOffer);
router.patch('/admin/offers/:id', affiliateController.updateOffer);

router.get('/admin/links', affiliateController.links);
router.post('/admin/links', affiliateController.createLink);
router.patch('/admin/links/:id', affiliateController.updateLink);

router.post('/admin/sales', affiliateController.recordSale);
router.patch('/admin/sales/:id/status', affiliateController.saleStatus);

router.post('/webhook/sale', affiliateController.webhookSale);

export default router;
