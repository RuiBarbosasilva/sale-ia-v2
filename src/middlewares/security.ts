import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

const ADMIN_FAILURE_WINDOW_MS = 5 * 60 * 1000;
const ADMIN_FAILURE_LIMIT = 20;
const adminFailures = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT_MAX_KEYS = 10000;
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

function adminFailureAllowed(ip: string) {
  const now = Date.now();
  const current = adminFailures.get(ip);
  if (!current || current.resetAt <= now) {
    adminFailures.set(ip, { count: 1, resetAt: now + ADMIN_FAILURE_WINDOW_MS });
    return true;
  }
  if (current.count >= ADMIN_FAILURE_LIMIT) return false;
  current.count += 1;
  return true;
}

function adminFailureClear(ip: string) {
  adminFailures.delete(ip);
}

function pruneRateLimitBuckets(now: number) {
  if (rateLimitBuckets.size < RATE_LIMIT_MAX_KEYS) return;
  for (const [key, bucket] of rateLimitBuckets) {
    if (bucket.resetAt <= now) rateLimitBuckets.delete(key);
  }
  if (rateLimitBuckets.size >= RATE_LIMIT_MAX_KEYS) {
    const oldest = rateLimitBuckets.keys().next().value;
    if (oldest) rateLimitBuckets.delete(oldest);
  }
}

export function rateLimit(options: {
  name: string;
  windowMs: number;
  limit: number;
  key?: (req: Request) => string;
}) {
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const identity = options.key ? options.key(req) : req.ip;
    const key = options.name + ':' + identity;
    let bucket = rateLimitBuckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      pruneRateLimitBuckets(now);
      bucket = { count: 1, resetAt: now + options.windowMs };
      rateLimitBuckets.set(key, bucket);
      return next();
    }

    bucket.count += 1;
    if (bucket.count > options.limit) {
      const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfter));
      return res.status(429).json({
        success: false,
        error: 'RATE_LIMITED',
        requestId: (req as any).requestId,
      });
    }

    next();
  };
}

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
  if (!adminFailureAllowed(req.ip)) {
    return res.status(429).json({
      success: false,
      error: 'ADMIN_RATE_LIMITED',
      requestId: (req as any).requestId,
    });
  }
  if (!timingSafeSecret(expected, provided)) {
    return res.status(401).json({
      success: false,
      error: 'ADMIN_UNAUTHORIZED',
      requestId: (req as any).requestId,
    });
  }
  adminFailureClear(req.ip);
  next();
}

export function requestId(req: Request, res: Response, next: NextFunction) {
  const incoming = String(req.header('x-request-id') || '');
  const id = /^[A-Za-z0-9._:-]{1,100}$/.test(incoming) ? incoming : crypto.randomUUID();
  res.setHeader('X-Request-Id', id);
  (req as any).requestId = id;
  next();
}
