import { Request, Response, NextFunction } from 'express';

export const adminAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const adminKey = process.env.ADMIN_KEY || 'sale-ia-2026-admin-key-secure';
  
  // Lista EXATA de rotas públicas - HTML e APIs de auth
  const publicPaths = [
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
    '/favicon.ico'
  ];
  
  // Se é uma rota pública HTML, libera SEMPRE
  if (publicPaths.some(p => req.path === p || req.path.startsWith(p + '/'))) {
    return next();
  }
  
  // Se é uma rota HTML (não API), libera SEMPRE
  if (!req.path.startsWith('/api/') && req.path.includes('.')) {
    return next();
  }
  
  // Para APIs, verifica o cookie ou header
  const providedKey = req.cookies?.adminKey || req.headers['x-admin-key'];
  
  if (!providedKey || providedKey !== adminKey) {
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ error: 'ADMIN_UNAUTHORIZED' });
    }
    return res.redirect('/login');
  }
  
  next();
};