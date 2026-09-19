import {Request,Response} from 'express';
import {affiliateActionService as s} from '../services/affiliateActionService';
import {timingSafeSecret} from '../middlewares/security';

function guard(req:Request,res:Response){
  const k=process.env.AFFILIATE_ADMIN_KEY;
  if(!timingSafeSecret(k,req.header('x-affiliate-admin-key'))){
    res.status(401).json({success:false,error:'ADMIN_UNAUTHORIZED',requestId:(req as any).requestId});
    return false;
  }
  return true;
}
function err(res:Response,e:unknown){
  const m:Record<string,number>={ACTION_NOT_FOUND:404,ACTION_NOT_APPROVABLE:409,ACTION_NOT_APPROVED:409};
  const raw=e instanceof Error?e.message:'';
  const c=Object.prototype.hasOwnProperty.call(m,raw)?raw:'ACTION_ERROR';
  res.status(m[c]||500).json({success:false,error:c,requestId:(res.req as any)?.requestId});
}
export const affiliateActionController={
 async list(req:Request,res:Response){if(!guard(req,res))return;try{res.json({success:true,actions:await s.list(req.query.status as string|undefined)});}catch(e){err(res,e);}},
 async approve(req:Request,res:Response){if(!guard(req,res))return;try{res.json({success:true,action:await s.approve(req.params.id)});}catch(e){err(res,e);}},
 async reject(req:Request,res:Response){if(!guard(req,res))return;try{res.json({success:true,action:await s.reject(req.params.id,req.body?.reason)});}catch(e){err(res,e);}},
 async execute(req:Request,res:Response){if(!guard(req,res))return;try{res.json({success:true,action:await s.markExecuted(req.params.id,req.body?.result)});}catch(e){err(res,e);}}
};