import { Request, Response, NextFunction } from 'express';
import { timingSafeSecret } from '../../../middlewares/security';

export function mercadoLivreAdminGuard(req: Request, res: Response, next: NextFunction) {
  const expected = process.env.MERCADO_LIVRE_ADMIN_KEY || process.env.AFFILIATE_ADMIN_KEY;
  const provided = req.header('x-mercado-livre-admin-key') || req.header('x-affiliate-admin-key');

  if (!timingSafeSecret(expected, provided)) {
    return res.status(401).json({
      success: false,
      error: 'MERCADO_LIVRE_ADMIN_UNAUTHORIZED',
      requestId: (req as any).requestId,
    });
  }

  return next();
}
