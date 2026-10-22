import { Router, Request, Response } from 'express';

const router = Router();

router.post('/verify-key', (req: Request, res: Response) => {
  const { key } = req.body;
  const adminKey = process.env.ADMIN_KEY || 'sale-ia-2026-admin-key-secure';
  
  if (key === adminKey) {
    // Define cookie com duração de 24 horas
    res.cookie('adminKey', key, {
      maxAge: 86400000, // 24 horas
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });
    return res.json({ success: true, message: 'Autenticação bem-sucedida' });
  }
  
  return res.status(401).json({ success: false, error: 'Chave incorreta' });
});

router.get('/logout', (req: Request, res: Response) => {
  res.clearCookie('adminKey');
  return res.redirect('/login');
});

export default router;