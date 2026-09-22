import {Request,Response} from 'express';
import {rbFactorySalesAutonomyService} from '../services/rbFactorySalesAutonomyService';
export const rbFactorySalesAutonomyController={
  status(_req:Request,res:Response){res.json({success:true,result:rbFactorySalesAutonomyService.status()});},
  history(req:Request,res:Response){res.json({success:true,...rbFactorySalesAutonomyService.history(Number(req.query.limit||20))});},
  alerts(req:Request,res:Response){res.json({success:true,...rbFactorySalesAutonomyService.alerts(Number(req.query.limit||10))});},
  async start(_req:Request,res:Response){try{res.json({success:true,result:await rbFactorySalesAutonomyService.start()});}catch(e:any){res.status(500).json({success:false,error:e.message});}},
  stop(_req:Request,res:Response){res.json({success:true,result:rbFactorySalesAutonomyService.stop()});},
  acknowledge(req:Request,res:Response){try{res.json({success:true,alert:rbFactorySalesAutonomyService.acknowledge(String(req.params.id))});}catch(e:any){res.status(404).json({success:false,error:e.message});}},
  resolve(req:Request,res:Response){try{res.json({success:true,alert:rbFactorySalesAutonomyService.resolve(String(req.params.id))});}catch(e:any){res.status(404).json({success:false,error:e.message});}}
};