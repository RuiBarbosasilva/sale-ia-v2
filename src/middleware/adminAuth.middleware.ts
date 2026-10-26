import { Request, Response, NextFunction } from 'express';
import { createHmac, timingSafeEqual } from 'crypto';

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function validSession(value: unknown, secret: string): boolean {
  if (typeof value !== 'string') return false;
  const match = value.match(/^v1\.(\d{13})\.([A-Za-z0-9_-]+)$/);
  if (!match) return false;
  const expiry = Number(match[1]);
  if (!Number.isSafeInteger(expiry) || expiry <= Date.now()) return false;
  const payload = 'v1.' + match[1];
  const expected = createHmac('sha256', secret).update(payload).digest('base64url');
  return safeEqual(match[2], expected);
}

export const adminAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const adminKey = process.env.SALE_IA_ADMIN_KEY || process.env.ADMIN_KEY;

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
  if (!req.path.startsWith('/api/') && /\.[a-z0-9]+$/i.test(req.path)) return next();

  if (!adminKey) {
    if (req.path.startsWith('/api/')) {
      return res.status(503).json({ error: 'ADMIN_KEY_NOT_CONFIGURED' });
    }
    return res.redirect('/login');
  }

  const cookieSessionValid = validSession(req.cookies?.adminKey, adminKey);
  const headerKey = req.headers['x-admin-key'];
  const headerValid = typeof headerKey === 'string' && safeEqual(headerKey, adminKey);

  if (!cookieSessionValid && !headerValid) {
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ error: 'ADMIN_UNAUTHORIZED' });
    }
    return res.redirect('/login');
  }

  return next();
};
