import { Request, Response } from 'express';
import { salesOrchestrationService } from '../services/salesOrchestrationService';

const ok=(res:Response,data:any)=>res.json({success:true,data});
const fail=(res:Response,e:any)=>res.status(500).json({success:false,error:e?.message||'SALES_ORCHESTRATION_ERROR'});

export const salesOrchestrationController = {
  async analytics(_req:Request,res:Response){try{return ok(res,await salesOrchestrationService.analytics());}catch(e){return fail(res,e);}},
  async offers(_req:Request,res:Response){try{return ok(res,await salesOrchestrationService.offers());}catch(e){return fail(res,e);}},
  async createOffer(req:Request,res:Response){try{return ok(res,await salesOrchestrationService.createOffer(req.body));}catch(e){return fail(res,e);}},
  async experiments(_req:Request,res:Response){try{return ok(res,await salesOrchestrationService.experiments());}catch(e){return fail(res,e);}},
  async createExperiment(req:Request,res:Response){try{return ok(res,await salesOrchestrationService.createExperiment(req.body));}catch(e){return fail(res,e);}},
  async recordMetric(req:Request,res:Response){try{return ok(res,await salesOrchestrationService.recordMetric(req.body));}catch(e){return fail(res,e);}},
  async dueFollowUps(_req:Request,res:Response){try{return ok(res,await salesOrchestrationService.dueFollowUps());}catch(e){return fail(res,e);}},
  async markFollowUp(req:Request,res:Response){try{return ok(res,await salesOrchestrationService.markFollowUp(req.params.id,req.body.status));}catch(e){return fail(res,e);}}
};
