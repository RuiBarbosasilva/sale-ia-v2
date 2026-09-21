import { Request, Response } from 'express';
import { websiteService } from '../services/website/websiteService';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class WebsiteController {
  async analyze(req: Request, res: Response) {
    try {
      const { prospectId } = req.body;
      if (!prospectId) return res.status(400).json({ error: 'prospectId obrigatório' });
      const analysis = await websiteService.analyzeProspect(prospectId);
      res.json({ success: true, analysis });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async generate(req: Request, res: Response) {
    try {
      const { prospectId } = req.body;
      if (!prospectId) return res.status(400).json({ error: 'prospectId obrigatório' });

      // Rota legada: mantém compatibilidade, mas não permite mais que uma
      // geração simples bypass o Image Engine e o Quality Gate profissional.
      const prospect = await prisma.websiteProspect.findUnique({ where: { id: prospectId } });
      if (!prospect) return res.status(404).json({ success: false, error: 'Prospect não encontrado' });

      const result = await websiteService.generateProfessional(
        prospectId,
        {
          businessName: prospect.companyName || 'Sua Empresa',
          category: prospect.segment || 'negócio',
          city: prospect.city || 'sua cidade',
          phone: prospect.phone || '',
          whatsapp: prospect.phone || '',
          email: prospect.email || '',
          website: prospect.currentWebsite || ''
        },
        true
      );

      res.json({
        success: true,
        demoId: result.demo.id,
        version: result.demo.version,
        qualityScore: result.qualityReview.overallScore,
        qualityRecommendation: result.qualityReview.recommendation,
        improvementCycles: result.improvementCycles,
        previewUrl: '/api/websites/studio/demos/' + result.demo.id + '/html'
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getDemo(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const code = await websiteService.getDemo(id);
      if (!code) return res.status(404).json({ error: 'Demo não encontrado' });
      res.set('Content-Type', 'text/html; charset=utf-8');
      res.send(code);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async listDemos(req: Request, res: Response) {
    try {
      const demos = await (require('@prisma/client').PrismaClient ? new (require('@prisma/client').PrismaClient)().websiteDemo.findMany({ orderBy: { createdAt: 'desc' }, take: 50, include: { prospect: true } }) : []);
      res.json({ success: true, demos });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}

export const websiteController = new WebsiteController();
