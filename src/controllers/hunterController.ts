import { Request, Response } from 'express';
import { hunterService } from '../services/hunterService';

function ok(res:Response,data:any){ return res.json({success:true,data}); }
function fail(res:Response,e:any){ return res.status(500).json({success:false,error:e?.message||'HUNTER_ERROR'}); }

export const hunterController = {
  async dashboard(req:Request,res:Response){ try{return ok(res,await hunterService.dashboard());}catch(e){return fail(res,e);} },
  async opportunities(req:Request,res:Response){ try{return ok(res,await hunterService.listOpportunities());}catch(e){return fail(res,e);} },
  async createOpportunity(req:Request,res:Response){ try{return ok(res,await hunterService.createOpportunity(req.body));}catch(e){return fail(res,e);} },
  async evidence(req:Request,res:Response){ try{return ok(res,await hunterService.addEvidence(req.params.id,req.body));}catch(e){return fail(res,e);} },
  async suppliers(req:Request,res:Response){ try{return ok(res,await hunterService.suppliers());}catch(e){return fail(res,e);} },
  async createSupplier(req:Request,res:Response){ try{return ok(res,await hunterService.createSupplier(req.body));}catch(e){return fail(res,e);} },
  async products(req:Request,res:Response){ try{return ok(res,await hunterService.products());}catch(e){return fail(res,e);} },
  async createProduct(req:Request,res:Response){ try{return ok(res,await hunterService.createProduct(req.body));}catch(e){return fail(res,e);} },
  async supplierChecklist(req:Request,res:Response){ try{return ok(res,await hunterService.supplierChecklist(req.params.id));}catch(e){return fail(res,e);} },
  async platforms(req:Request,res:Response){ try{return ok(res,await hunterService.platformBootstrap());}catch(e){return fail(res,e);} }
};
