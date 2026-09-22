import { Request, Response } from 'express';
import { rbFactorySiteMaintenanceService } from '../services/website/rbFactorySiteMaintenanceService';

export const rbFactorySiteMaintenanceController = {
  async list(_req: Request, res: Response) {
    try {
      const clients = await rbFactorySiteMaintenanceService.listClients();
      res.json({ success: true, clients });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  },

  async createFromProject(req: Request, res: Response) {
    try {
      const client = await rbFactorySiteMaintenanceService.createFromProject(
        String(req.body?.projectId || ''),
        req.body || {}
      );
      res.status(201).json({ success: true, client });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  },

  async details(req: Request, res: Response) {
    try {
      const data = await rbFactorySiteMaintenanceService.getDetails(String(req.params.id));
      res.json({ success: true, ...data });
    } catch (e: any) {
      res.status(404).json({ success: false, error: e.message });
    }
  },

  async createChangeRequest(req: Request, res: Response) {
    try {
      const data = await rbFactorySiteMaintenanceService.createChangeRequest(String(req.params.id), req.body || {});
      res.status(201).json({ success: true, ...data });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  },

  async applyChangeRequest(req: Request, res: Response) {
    try {
      const result = await rbFactorySiteMaintenanceService.applyChangeRequest(
        String(req.params.id), String(req.params.requestId)
      );
      res.json({ success: true, ...result });
    } catch (e: any) {
      const status = e.message.includes('não encontrado') ? 404 : 400;
      res.status(status).json({ success: false, error: e.message });
    }
  },

  async generateDueSuggestions(_req: Request, res: Response) {
    try {
      const suggestions = await rbFactorySiteMaintenanceService.generateDueSuggestions();
      res.json({ success: true, count: suggestions.length, suggestions });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  },

  async markSuggestionSent(req: Request, res: Response) {
    try {
      const result = await rbFactorySiteMaintenanceService.markSuggestionSent(String(req.params.id));
      res.json({ success: true, result });
    } catch (e: any) {
      res.status(400).json({ success: false, error: e.message });
    }
  }
};
