import { Router, Request, Response } from 'express';

const router = Router();

function configuredAdminKey(): string | undefined {
  const key = process.env.SALE_IA_ADMIN_KEY || process.env.ADMIN_KEY;
  return key && key.trim() ? key : undefined;
}

router.post('/verify-key', (req: Request, res: Response) => {
  const expected = configuredAdminKey();
  if (!expected) {
    return res.status(503).json({ success: false, error: 'ADMIN_KEY_NOT_CONFIGURED' });
  }

  const supplied = typeof req.body?.key === 'string' ? req.body.key : '';
  if (!supplied || supplied !== expected) {
    return res.status(401).json({ success: false, error: 'INVALID_CREDENTIALS' });
  }

  res.cookie('adminKey', expected, {
    maxAge: 8 * 60 * 60 * 1000,
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
