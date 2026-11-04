import { Router, Request, Response } from 'express';
import { createHmac, timingSafeEqual } from 'crypto';

const router = Router();
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

function configuredAdminKey(): string | undefined {
  const key = process.env.SALE_IA_ADMIN_KEY || process.env.ADMIN_KEY;
  return key && key.trim() ? key : undefined;
}

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function signSession(expiry: number, secret: string): string {
  const payload = 'v1.' + expiry;
  const signature = createHmac('sha256', secret).update(payload).digest('base64url');
  return payload + '.' + signature;
}

router.post('/verify-key', (req: Request, res: Response) => {
  const expected = configuredAdminKey();
  if (!expected) {
    return res.status(503).json({ success: false, error: 'ADMIN_KEY_NOT_CONFIGURED' });
  }

  const supplied = typeof req.body?.key === 'string' ? req.body.key : '';
  if (!supplied || !safeEqual(supplied, expected)) {
    return res.status(401).json({ success: false, error: 'INVALID_CREDENTIALS' });
  }

  const session = signSession(Date.now() + SESSION_TTL_MS, expected);
  res.cookie('adminKey', session, {
    maxAge: SESSION_TTL_MS,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
  return res.json({ success: true });
});

router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('adminKey', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
  return res.json({ success: true });
});

router.get('/logout', (_req: Request, res: Response) => {
  res.clearCookie('adminKey', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
  return res.redirect('/login');
});

export default router;
