import { Request, Response } from 'express';
import { seniorSalesAgentService } from '../services/seniorSalesAgentService';
export const seniorSalesController={
  health: async (_req:Request,res:Response)=>res.json({success:true,module:'senior-sales-agent',status:'ONLINE',mode:'SUPERVISED'}),
  dashboard: async (_req:Request,res:Response)=>res.json(await seniorSalesAgentService.dashboard()),
  create: async (req:Request,res:Response)=>res.status(201).json(await seniorSalesAgentService.createConversation(req.body||{})),
  get: async (req:Request,res:Response)=>res.json(await seniorSalesAgentService.getConversation(req.params.id)),
  respond: async (req:Request,res:Response)=>res.json(await seniorSalesAgentService.respond(req.params.id,req.body||{})),
  followUp: async (req:Request,res:Response)=>res.status(201).json(await seniorSalesAgentService.scheduleFollowUp(req.params.id,req.body||{})),
  approveAction: async (req:Request,res:Response)=>res.json(await seniorSalesAgentService.approveAction(req.params.id)),
  rejectAction: async (req:Request,res:Response)=>res.json(await seniorSalesAgentService.rejectAction(req.params.id,req.body?.reason)),
  markActionSent: async (req:Request,res:Response)=>res.json(await seniorSalesAgentService.markActionSent(req.params.id,req.body||{}))
};
