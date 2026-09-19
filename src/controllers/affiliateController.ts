import { Request, Response } from 'express';
import { affiliateService } from '../services/affiliateService';

function adminGuard(req: Request, res: Response) {
  const expected = process.env.AFFILIATE_ADMIN_KEY;
  if (!expected || req.header('x-affiliate-admin-key') !== expected) {
    res.status(401).json({ success: false, error: 'ADMIN_UNAUTHORIZED' });
    return false;
  }
  return true;
}

function tokenFrom(req: Request) {
  const h = req.header('authorization') || '';
  return h.startsWith('Bearer ') ? h.slice(7) : (req.header('x-affiliate-token') || '');
}

async function authenticatedAffiliate(req: Request, res: Response) {
  try { return await affiliateService.authenticate(tokenFrom(req)); }
  catch { res.status(401).json({ success: false, error: 'AFFILIATE_UNAUTHORIZED' }); return null; }
}

function handleError(res: Response, error: any) {
  const map: Record<string, number> = {
    AFFILIATE_EMAIL_EXISTS: 409,
    AFFILIATE_NOT_FOUND: 404,
    AFFILIATE_UNAUTHORIZED: 401,
    AFFILIATE_TOKEN_REQUIRED: 401,
    AFFILIATE_REQUIRED: 400,
    AFFILIATE_BLOCKED: 403,
    LINK_NOT_FOUND: 404,
    LINK_CODE_EXISTS: 409,
    OFFER_NOT_FOUND: 404,
    OFFER_NAME_REQUIRED: 400,
    SALE_NOT_FOUND: 404,
    PAYOUT_NOT_FOUND: 404,
    NO_AVAILABLE_BALANCE: 400,
    INVALID_DESTINATION_URL: 400,
    INVALID_SALE_AMOUNT: 400,
    INVALID_COMMISSION_RATE: 400,
    INVALID_AFFILIATE_STATUS: 400,
    INVALID_SALE_STATUS: 400,
    INVALID_PAYOUT_STATUS: 400,
    INVALID_SALE_STATUS_TRANSITION: 409,
    INVALID_PAYOUT_STATUS_TRANSITION: 409,
    SALE_ALLOCATED_TO_OPEN_PAYOUT: 409,
    PAYOUT_WITHOUT_ITEMS: 409,
    PAYOUT_SALES_NOT_AVAILABLE: 409,
    PAYOUT_SALES_CHANGED: 409,
    PAYOUT_AMOUNT_MISMATCH: 409,
    NAME_AND_EMAIL_REQUIRED: 400,
  };
  const code = error?.message || 'AFFILIATE_ERROR';
  return res.status(map[code] || 500).json({ success: false, error: code });
}

export const affiliateController = {
  async health(_req: Request, res: Response) {
    try {
      await affiliateService.adminStats();
      res.json({ success: true, status: 'OK', module: 'AFFILIATES', timestamp: new Date().toISOString() });
    } catch (error) { handleError(res, error); }
  },

  async register(req: Request, res: Response) {
    try {
      if (!req.body?.name || !req.body?.email) return res.status(400).json({ success: false, error: 'NAME_AND_EMAIL_REQUIRED' });
      const result = await affiliateService.register(req.body);
      res.status(201).json({ success: true, ...result, warning: 'Guarde o token; ele nao sera exibido novamente.' });
    } catch (error) { handleError(res, error); }
  },

  async portal(req: Request, res: Response) {
    const affiliate = await authenticatedAffiliate(req, res);
    if (!affiliate) return;
    try { res.json({ success: true, ...await affiliateService.dashboard(affiliate.id) }); }
    catch (error) { handleError(res, error); }
  },

  async portalLinks(req: Request, res: Response) {
    const affiliate = await authenticatedAffiliate(req, res);
    if (!affiliate) return;
    try { res.json({ success: true, links: await affiliateService.listLinks(affiliate.id) }); }
    catch (error) { handleError(res, error); }
  },

  async createPortalLink(req: Request, res: Response) {
    const affiliate = await authenticatedAffiliate(req, res);
    if (!affiliate) return;
    try { res.status(201).json({ success: true, link: await affiliateService.createLink(affiliate.id, req.body || {}) }); }
    catch (error) { handleError(res, error); }
  },

  async requestPayout(req: Request, res: Response) {
    const affiliate = await authenticatedAffiliate(req, res);
    if (!affiliate) return;
    try { res.status(201).json({ success: true, payout: await affiliateService.requestPayout(affiliate.id, req.body?.method) }); }
    catch (error) { handleError(res, error); }
  },

  async adminList(req: Request, res: Response) {
    if (!adminGuard(req, res)) return;
    try { res.json({ success: true, affiliates: await affiliateService.list() }); } catch (e) { handleError(res, e); }
  },

  async adminGet(req: Request, res: Response) {
    if (!adminGuard(req, res)) return;
    try { res.json({ success: true, affiliate: await affiliateService.get(req.params.id) }); } catch (e) { handleError(res, e); }
  },

  async adminUpdate(req: Request, res: Response) {
    if (!adminGuard(req, res)) return;
    try { res.json({ success: true, affiliate: await affiliateService.update(req.params.id, req.body || {}) }); } catch (e) { handleError(res, e); }
  },

  async adminRotateToken(req: Request, res: Response) {
    if (!adminGuard(req, res)) return;
    try { res.json({ success: true, ...await affiliateService.rotateAccessToken(req.params.id), warning: 'O token anterior foi invalidado.' }); } catch (e) { handleError(res, e); }
  },

  async offers(req: Request, res: Response) {
    if (!adminGuard(req, res)) return;
    try { res.json({ success: true, offers: await affiliateService.listOffers(req.query.activeOnly === 'true') }); } catch (e) { handleError(res, e); }
  },

  async createOffer(req: Request, res: Response) {
    if (!adminGuard(req, res)) return;
    try { res.status(201).json({ success: true, offer: await affiliateService.createOffer(req.body || {}) }); } catch (e) { handleError(res, e); }
  },

  async updateOffer(req: Request, res: Response) {
    if (!adminGuard(req, res)) return;
    try { res.json({ success: true, offer: await affiliateService.updateOffer(req.params.id, req.body || {}) }); } catch (e) { handleError(res, e); }
  },

  async links(req: Request, res: Response) {
    if (!adminGuard(req, res)) return;
    try { res.json({ success: true, links: await affiliateService.listLinks(req.query.affiliateId as string || undefined) }); } catch (e) { handleError(res, e); }
  },

  async createLink(req: Request, res: Response) {
    if (!adminGuard(req, res)) return;
    try { res.status(201).json({ success: true, link: await affiliateService.createLink(req.body.affiliateId, req.body || {}) }); } catch (e) { handleError(res, e); }
  },

  async updateLink(req: Request, res: Response) {
    if (!adminGuard(req, res)) return;
    try { res.json({ success: true, link: await affiliateService.updateLink(req.params.id, req.body || {}) }); } catch (e) { handleError(res, e); }
  },

  async recordSale(req: Request, res: Response) {
    if (!adminGuard(req, res)) return;
    try { res.status(201).json({ success: true, sale: await affiliateService.recordSale(req.body || {}) }); } catch (e) { handleError(res, e); }
  },

  async sales(req: Request, res: Response) {
    if (!adminGuard(req, res)) return;
    try {
      res.json({
        success: true,
        sales: await affiliateService.listSales({
          affiliateId: req.query.affiliateId as string | undefined,
          status: req.query.status as string | undefined,
          source: req.query.source as string | undefined,
          take: Number(req.query.take || 100),
        }),
      });
    } catch (e) { handleError(res, e); }
  },

  async webhookSale(req: Request, res: Response) {
    const expected = process.env.AFFILIATE_WEBHOOK_KEY;
    if (!expected || req.header('x-affiliate-webhook-key') !== expected) {
      return res.status(401).json({ success: false, error: 'WEBHOOK_UNAUTHORIZED' });
    }
    try {
      const sale = await affiliateService.recordSale({ ...(req.body || {}), source: req.body?.source || 'WEBHOOK' });
      res.status(201).json({ success: true, sale, idempotent: Boolean(req.body?.externalOrderId && sale.externalOrderId === req.body.externalOrderId) });
    } catch (e) { handleError(res, e); }
  },

  async saleStatus(req: Request, res: Response) {
    if (!adminGuard(req, res)) return;
    try { res.json({ success: true, sale: await affiliateService.setSaleStatus(req.params.id, req.body.status) }); } catch (e) { handleError(res, e); }
  },

  async payoutStatus(req: Request, res: Response) {
    if (!adminGuard(req, res)) return;
    try {
      res.json({
        success: true,
        payout: await affiliateService.setPayoutStatus(req.params.id, req.body.status, req.body.reference, req.body.notes),
      });
    } catch (e) { handleError(res, e); }
  },

  async payouts(req: Request, res: Response) {
    if (!adminGuard(req, res)) return;
    try {
      res.json({
        success: true,
        payouts: await affiliateService.listPayouts({
          affiliateId: req.query.affiliateId as string | undefined,
          status: req.query.status as string | undefined,
        }),
      });
    } catch (e) { handleError(res, e); }
  },

  async stats(req: Request, res: Response) {
    if (!adminGuard(req, res)) return;
    try { res.json({ success: true, stats: await affiliateService.adminStats() }); } catch (e) { handleError(res, e); }
  },

  async redirect(req: Request, res: Response) {
    try {
      const result = await affiliateService.trackClick(req.params.code, {
        ip: req.ip, userAgent: req.get('user-agent'), referer: req.get('referer'),
      });
      res.redirect(302, result.destinationUrl);
    } catch (e) { handleError(res, e); }
  },
};
