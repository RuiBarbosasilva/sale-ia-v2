import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

export function timingSafeSecret(expected: string | undefined, provided: string | undefined): boolean {
  if (!expected || !provided) return false;
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(provided, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
}

export function adminAuthorization(req: Request, res: Response, next: NextFunction) {
  const expected = process.env.SALE_IA_ADMIN_KEY || process.env.AFFILIATE_ADMIN_KEY;
  const provided = req.header('x-sale-ia-admin-key') || req.header('x-affiliate-admin-key');
  if (!timingSafeSecret(expected, provided)) {
    return res.status(401).json({
      success: false,
      error: 'ADMIN_UNAUTHORIZED',
      requestId: (req as any).requestId,
    });
  }
  next();
}

export function requestId(req: Request, res: Response, next: NextFunction) {
  const incoming = String(req.header('x-request-id') || '');
  const id = /^[A-Za-z0-9._:-]{1,100}$/.test(incoming) ? incoming : crypto.randomUUID();
  res.setHeader('X-Request-Id', id);
  (req as any).requestId = id;
  next();
}
