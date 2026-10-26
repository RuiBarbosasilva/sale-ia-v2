import { Request, Response, NextFunction } from 'express';

export const adminAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const adminKey = process.env.SALE_IA_ADMIN_KEY || process.env.ADMIN_KEY;

  // Public pages/endpoints are explicit; avoid broad prefix checks that can
  // accidentally make protected routes public.
  const publicPaths = new Set([
    '/login',
    '/api/verify-key',
    '/main-dashboard.html',
    '/manual.html',
    '/factory-ebook-dashboard.html',
    '/moneyprinter-dashboard.html',
    '/aivio-dashboard.html',
    '/tubefy-dashboard.html',
    '/blog-factory.html',
    '/blog-factory',
    '/dashboard',
    '/affiliates',
    '/manual',
    '/',
    '/favicon.ico',
  ]);

  if (publicPaths.has(req.path)) return next();

  // Static assets are served separately; only permit known HTML/assets here.
  if (!req.path.startsWith('/api/') && /\.[a-z0-9]+$/i.test(req.path)) return next();

  if (!adminKey) {
    if (req.path.startsWith('/api/')) {
      return res.status(503).json({ error: 'ADMIN_KEY_NOT_CONFIGURED' });
    }
    return res.redirect('/login');
  }

  const providedKey = req.cookies?.adminKey || req.headers['x-admin-key'];
  if (typeof providedKey !== 'string' || providedKey !== adminKey) {
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ error: 'ADMIN_UNAUTHORIZED' });
    }
    return res.redirect('/login');
  }

  return next();
};
