import { Request,Response } from 'express';
import { rbFactoryCommercialService } from '../services/rbFactoryCommercialService';
export const rbFactoryCommercialController={
 async dashboard(req:Request,res:Response){try{res.json({success:true,...await rbFactoryCommercialService.dashboard(String(req.query.city||'Poços de Caldas'),req.query.segment?String(req.query.segment):undefined)});}catch(e:any){res.status(500).json({success:false,error:e.message});}},
 async bootstrap(req:Request,res:Response){try{res.json({success:true,...await rbFactoryCommercialService.createPipelinesForQualified(String(req.body?.city||'Poços de Caldas'),req.body?.segment?String(req.body.segment):undefined,Number(req.body?.limit||50))});}catch(e:any){res.status(500).json({success:false,error:e.message});}},
 async queue(req:Request,res:Response){try{res.json({success:true,queue:await rbFactoryCommercialService.prepareOutreachQueue(String(req.query.city||'Poços de Caldas'),req.query.segment?String(req.query.segment):undefined,Number(req.query.limit||20))});}catch(e:any){res.status(500).json({success:false,error:e.message});}},
 async followUp(req:Request,res:Response){try{res.json({success:true,prospect:await rbFactoryCommercialService.scheduleFollowUp(String(req.params.id),Number(req.body?.days||3),req.body?.note)});}catch(e:any){res.status(400).json({success:false,error:e.message});}}
};
