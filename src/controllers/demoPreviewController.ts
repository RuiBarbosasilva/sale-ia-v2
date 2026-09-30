import { Request, Response } from 'express';
import { prisma } from '../modules/mercadoLivre/lib/prisma';

export const demoPreviewController = {
  async preview(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const demo = await prisma.websiteDemo.findUnique({
        where: { id },
        select: { sourceCode: true, prospectId: true, status: true }
      });

      if (!demo || !demo.sourceCode) {
        return res.status(404).send('Demo nÃ£o encontrada ou sem conteÃºdo');
      }

      // Serve o HTML diretamente no navegador
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(demo.sourceCode);
      
    } catch (error: any) {
      console.error('[DemoPreview] Erro:', error.message);
      return res.status(500).send('Erro ao carregar preview');
    }
  },

  async list(req: Request, res: Response) {
    try {
      const demos = await prisma.websiteDemo.findMany({
        select: {
          id: true,
          prospectId: true,
          status: true,
          generatedAt: true,
          version: true,
          prospect: {
            select: {
              companyName: true,
              segment: true,
              city: true
            }
          }
        },
        orderBy: { generatedAt: 'desc' },
        take: 50
      });

      return res.json({ success: true, demos });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }
};
