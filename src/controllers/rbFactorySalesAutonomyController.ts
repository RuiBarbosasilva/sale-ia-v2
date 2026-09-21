import { Request, Response } from 'express';
import { rbFactorySalesAutonomyService } from '../services/rbFactorySalesAutonomyService';

export const rbFactorySalesAutonomyController={
  async config(_req:Request,res:Response){try{res.json({success:true,config:await rbFactorySalesAutonomyService.config()});}catch(e:any){res.status(500).json({success:false,error:e?.message||'INTERNAL_ERROR'});}},
  async cycle(req:Request,res:Response){try{res.json({success:true,result:await rbFactorySalesAutonomyService.cycle(req.body?.limit||req.query?.limit)});}catch(e:any){res.status(500).json({success:false,error:e?.message||'INTERNAL_ERROR'});}},
  async history(req:Request,res:Response){try{res.json({success:true,runs:await rbFactorySalesAutonomyService.history(req.query?.limit)});}catch(e:any){res.status(500).json({success:false,error:e?.message||'INTERNAL_ERROR'});}}
};
