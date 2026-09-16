import { Request, Response } from 'express';
import { websiteService } from '../services/website/websiteService';

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
      const result = await websiteService.generateWebsite(prospectId);
      res.json({ success: true, ...result });
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
