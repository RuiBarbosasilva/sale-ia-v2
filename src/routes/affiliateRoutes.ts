import { Router } from 'express';
import { affiliateController } from '../controllers/affiliateController';
import { rateLimit } from '../middlewares/security';

const router = Router();

const registerRateLimit = rateLimit({ name: 'affiliate-register', windowMs: 15 * 60 * 1000, limit: 10 });
const portalRateLimit = rateLimit({ name: 'affiliate-portal', windowMs: 5 * 60 * 1000, limit: 30 });
const webhookRateLimit = rateLimit({ name: 'affiliate-webhook', windowMs: 60 * 1000, limit: 120 });

router.get('/health', affiliateController.health);
router.post('/register', registerRateLimit, affiliateController.register);

router.get('/portal', portalRateLimit, affiliateController.portal);
router.get('/portal/links', portalRateLimit, affiliateController.portalLinks);
router.post('/portal/links', portalRateLimit, affiliateController.createPortalLink);
router.post('/portal/payouts', portalRateLimit, affiliateController.requestPayout);

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

router.post('/webhook/sale', webhookRateLimit, affiliateController.webhookSale);

export default router;
