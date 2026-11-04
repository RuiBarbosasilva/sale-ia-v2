import { Request, Response } from 'express';
import { rbFactorySalesAutonomyService } from '../services/rbFactorySalesAutonomyService';

function boundedLimit(value: unknown, fallback: number, maximum: number): number {
  const parsed = value === undefined || value === null || value === '' ? fallback : Number(value);
  if (!Number.isSafeInteger(parsed)) return fallback;
  return Math.min(maximum, Math.max(1, parsed));
}

function errorMessage(error: unknown): string {
  return String((error as any)?.message || 'Falha ao executar operação de autonomia.');
}

export const rbFactorySalesAutonomyController = {
  async status(_req: Request, res: Response) {
    try {
      const result = await rbFactorySalesAutonomyService.status();
      return res.json({ success: true, result });
    } catch (error) {
      return res.status(500).json({ success: false, error: errorMessage(error) });
    }
  },

  async history(req: Request, res: Response) {
    try {
      const result = await rbFactorySalesAutonomyService.history(boundedLimit(req.query.limit, 20, 50));
      return res.json({ success: true, ...result });
    } catch (error) {
      return res.status(500).json({ success: false, error: errorMessage(error) });
    }
  },

  async alerts(req: Request, res: Response) {
    try {
      const result = await rbFactorySalesAutonomyService.alerts(boundedLimit(req.query.limit, 10, 20));
      return res.json({ success: true, ...result });
    } catch (error) {
      return res.status(500).json({ success: false, error: errorMessage(error) });
    }
  },

  async start(_req: Request, res: Response) {
    try {
      const result = await rbFactorySalesAutonomyService.start();
      return res.json({ success: true, result });
    } catch (error) {
      return res.status(500).json({ success: false, error: errorMessage(error) });
    }
  },

  async stop(_req: Request, res: Response) {
    try {
      const result = await rbFactorySalesAutonomyService.stop();
      return res.json({ success: true, result });
    } catch (error) {
      return res.status(500).json({ success: false, error: errorMessage(error) });
    }
  },

  async acknowledge(req: Request, res: Response) {
    try {
      const alert = await rbFactorySalesAutonomyService.acknowledge(String(req.params.id));
      return res.json({ success: true, alert });
    } catch (error) {
      const message = errorMessage(error);
      return res.status(message === 'SELLER_ALERT_NOT_FOUND' ? 404 : 500).json({ success: false, error: message });
    }
  },

  async resolve(req: Request, res: Response) {
    try {
      const alert = await rbFactorySalesAutonomyService.resolve(String(req.params.id));
      return res.json({ success: true, alert });
    } catch (error) {
      const message = errorMessage(error);
      return res.status(message === 'SELLER_ALERT_NOT_FOUND' ? 404 : 500).json({ success: false, error: message });
    }
  },
};
