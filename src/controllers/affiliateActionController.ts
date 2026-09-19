import {Request,Response} from 'express';
import {affiliateActionService as s} from '../services/affiliateActionService';
function guard(req:Request,res:Response){const k=process.env.AFFILIATE_ADMIN_KEY;if(!k||req.header('x-affiliate-admin-key')!==k){res.status(401).json({success:false,error:'ADMIN_UNAUTHORIZED'});return false;}return true;}
function err(res:Response,e:any){const m:any={ACTION_NOT_FOUND:404,ACTION_NOT_APPROVABLE:409,ACTION_NOT_APPROVED:409};const c=e?.message||'ACTION_ERROR';res.status(m[c]||500).json({success:false,error:c});}
export const affiliateActionController={
 async list(req:Request,res:Response){if(!guard(req,res))return;try{res.json({success:true,actions:await s.list(req.query.status as string|undefined)});}catch(e){err(res,e);}},
 async approve(req:Request,res:Response){if(!guard(req,res))return;try{res.json({success:true,action:await s.approve(req.params.id)});}catch(e){err(res,e);}},
 async reject(req:Request,res:Response){if(!guard(req,res))return;try{res.json({success:true,action:await s.reject(req.params.id,req.body?.reason)});}catch(e){err(res,e);}},
 async execute(req:Request,res:Response){if(!guard(req,res))return;try{res.json({success:true,action:await s.markExecuted(req.params.id,req.body?.result)});}catch(e){err(res,e);}}
};