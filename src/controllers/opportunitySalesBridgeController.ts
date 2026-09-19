import { Request, Response } from 'express';
import { opportunitySalesBridgeService } from '../services/opportunitySalesBridgeService';

export const opportunitySalesBridgeController = {
  async plans(req:Request,res:Response){
    res.json({success:true,plans:await opportunitySalesBridgeService.plans(req.query.status?String(req.query.status):undefined)});
  },
  async build(req:Request,res:Response){
    res.json({success:true,...await opportunitySalesBridgeService.buildForOpportunity(String(req.params.opportunityId))});
  },
  async approve(req:Request,res:Response){
    res.json({success:true,plan:await opportunitySalesBridgeService.approve(String(req.params.planId))});
  },
  async reject(req:Request,res:Response){
    res.json({success:true,plan:await opportunitySalesBridgeService.reject(String(req.params.planId))});
  }
};
