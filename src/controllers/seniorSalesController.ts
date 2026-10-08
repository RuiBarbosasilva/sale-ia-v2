import { Request, Response } from 'express';
import { seniorSalesAgentService } from '../services/seniorSalesAgentService';

const message = (error: unknown): string =>
  error instanceof Error ? error.message : 'UNKNOWN_ERROR';

const statusFor = (error: unknown): number => {
  const code = message(error);
  if (code === 'MESSAGE_REQUIRED' || code === 'INVALID_CONVERSATION_ID') return 400;
  if (code === 'SALES_CONVERSATION_NOT_FOUND' || code === 'SALES_ACTION_NOT_FOUND') return 404;
  if (code === 'SALES_ACTION_NOT_PENDING' || code === 'SALES_ACTION_NOT_APPROVED') return 409;
  if (code === 'INVALID_ACTION_ID') return 400;
  return 500;
};

export const seniorSalesController = {
  health: async (_req: Request, res: Response) =>
    res.json({ success: true, module: 'senior-sales-agent', status: 'ONLINE', mode: 'SUPERVISED' }),

  dashboard: async (_req: Request, res: Response) => {
    try {
      return res.json(await seniorSalesAgentService.dashboard());
    } catch (error: unknown) {
      console.error('[Senior Sales] Dashboard error:', message(error));
      return res.status(500).json({ success: false, error: 'SENIOR_SALES_DASHBOARD_FAILED' });
    }
  },

  create: async (req: Request, res: Response) => {
    try {
      return res.status(201).json(await seniorSalesAgentService.createConversation(req.body || {}));
    } catch (error: unknown) {
      console.error('[Senior Sales] Create error:', message(error));
      return res.status(500).json({ success: false, error: 'SENIOR_SALES_CREATE_FAILED' });
    }
  },

  get: async (req: Request, res: Response) => {
    try {
      return res.json(await seniorSalesAgentService.getConversation(req.params.id));
    } catch (error: unknown) {
      console.error('[Senior Sales] Get error:', message(error));
      return res.status(statusFor(error)).json({ success: false, error: message(error) });
    }
  },

  respond: async (req: Request, res: Response) => {
    try {
      return res.json(await seniorSalesAgentService.respond(req.params.id, req.body || {}));
    } catch (error: unknown) {
      console.error('[Senior Sales] Respond error:', message(error));
      return res.status(statusFor(error)).json({ success: false, error: message(error) });
    }
  },

  followUp: async (req: Request, res: Response) => {
    try {
      return res.status(201).json(await seniorSalesAgentService.scheduleFollowUp(req.params.id, req.body || {}));
    } catch (error: unknown) {
      console.error('[Senior Sales] Follow-up error:', message(error));
      return res.status(statusFor(error)).json({ success: false, error: message(error) });
    }
  },

  approveAction: async (req: Request, res: Response) => {
    try {
      return res.json(await seniorSalesAgentService.approveAction(req.params.id));
    } catch (error: unknown) {
      console.error('[Senior Sales] Approve error:', message(error));
      return res.status(statusFor(error)).json({ success: false, error: message(error) });
    }
  },

  rejectAction: async (req: Request, res: Response) => {
    try {
      return res.json(await seniorSalesAgentService.rejectAction(req.params.id, req.body?.reason));
    } catch (error: unknown) {
      console.error('[Senior Sales] Reject error:', message(error));
      return res.status(statusFor(error)).json({ success: false, error: message(error) });
    }
  },

  markActionSent: async (req: Request, res: Response) => {
    try {
      return res.json(await seniorSalesAgentService.markActionSent(req.params.id, req.body || {}));
    } catch (error: unknown) {
      console.error('[Senior Sales] Mark-sent error:', message(error));
      return res.status(statusFor(error)).json({ success: false, error: message(error) });
    }
  },
};
