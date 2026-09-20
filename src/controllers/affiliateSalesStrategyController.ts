import { Request, Response } from 'express';
import { affiliateSalesStrategyService as s } from '../services/affiliateSalesStrategyService';

function guard(req: Request, res: Response) {
  const key = process.env.AFFILIATE_ADMIN_KEY;
  if (!key || req.header('x-affiliate-admin-key') !== key) {
    res.status(401).json({ success: false, error: 'ADMIN_UNAUTHORIZED' });
    return false;
  }
  return true;
}

function err(res: Response, e: any) {
  const map: Record<string, number> = { NETWORK_NOT_FOUND: 404, PRODUCT_NOT_FOUND: 404 };
  const code = e?.message || 'AFFILIATE_STRATEGY_ERROR';
  res.status(map[code] || 500).json({ success: false, error: code });
}

export const affiliateSalesStrategyController = {
  async networkPlaybook(req: Request, res: Response) {
    if (!guard(req, res)) return;
    try { res.json({ success: true, ...await s.getNetworkPlaybook(req.params.id) }); }
    catch (e) { err(res, e); }
  },
  async productStrategy(req: Request, res: Response) {
    if (!guard(req, res)) return;
    try { res.json({ success: true, ...await s.buildProductStrategy(req.params.id) }); }
    catch (e) { err(res, e); }
  },
  async portfolio(req: Request, res: Response) {
    if (!guard(req, res)) return;
    try { res.json({ success: true, products: await s.generatePortfolio() }); }
    catch (e) { err(res, e); }
  }
};
