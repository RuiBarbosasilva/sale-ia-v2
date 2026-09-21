import { Request, Response } from 'express';
import { rbFactorySalesAutonomyService } from '../services/rbFactorySalesAutonomyService';

export const rbFactorySalesAutonomyController={
  async start(req:Request,res:Response){try{res.json({success:true,result:await rbFactorySalesAutonomyService.start(req.body||{})});}catch(e:any){res.status(500).json({success:false,error:e?.message||'INTERNAL_ERROR'});}},
  async stop(_req:Request,res:Response){try{res.json({success:true,result:await rbFactorySalesAutonomyService.stop()});}catch(e:any){res.status(500).json({success:false,error:e?.message||'INTERNAL_ERROR'});}},
  async status(_req:Request,res:Response){try{res.json({success:true,result:await rbFactorySalesAutonomyService.status()});}catch(e:any){res.status(500).json({success:false,error:e?.message||'INTERNAL_ERROR'});}},
  async config(_req:Request,res:Response){try{res.json({success:true,config:await rbFactorySalesAutonomyService.config()});}catch(e:any){res.status(500).json({success:false,error:e?.message||'INTERNAL_ERROR'});}},
  async cycle(req:Request,res:Response){try{res.json({success:true,result:await rbFactorySalesAutonomyService.cycle(Number(req.body?.limit||req.query?.limit||10))});}catch(e:any){res.status(500).json({success:false,error:e?.message||'INTERNAL_ERROR'});}},
  async history(req:Request,res:Response){try{res.json({success:true,runs:await rbFactorySalesAutonomyService.history(Number(req.query?.limit||50))});}catch(e:any){res.status(500).json({success:false,error:e?.message||'INTERNAL_ERROR'});}}
};
