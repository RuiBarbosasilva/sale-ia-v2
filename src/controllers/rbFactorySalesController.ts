import { Request, Response } from 'express';
import { rbFactorySalesService } from '../services/rbFactorySalesService';
export const rbFactorySalesController={
  async list(_req:Request,res:Response){res.json({success:true,pipelines:await rbFactorySalesService.list()});},
  async create(req:Request,res:Response){res.json({success:true,pipeline:await rbFactorySalesService.createFromProspect(String(req.params.prospectId))});},
  async demo(req:Request,res:Response){res.json({success:true,...await rbFactorySalesService.buildDemo(String(req.params.prospectId))});},
  async proposal(req:Request,res:Response){res.json({success:true,proposal:await rbFactorySalesService.buildProposal(String(req.params.prospectId))});},
  async stage(req:Request,res:Response){res.json({success:true,pipeline:await rbFactorySalesService.updateStage(String(req.params.id),String(req.body.stage||''),req.body.nextAction,req.body.notes)});}
};
