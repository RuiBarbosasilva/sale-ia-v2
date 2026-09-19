import {Request,Response} from 'express';
import {affiliateNetworkSecurityService as s} from '../services/affiliateNetworkSecurityService';
import {timingSafeSecret} from '../middlewares/security';
function guard(req:Request,res:Response){const k=process.env.AFFILIATE_ADMIN_KEY;if(!timingSafeSecret(k,req.header('x-affiliate-admin-key'))){res.status(401).json({success:false,error:'ADMIN_UNAUTHORIZED'});return false;}return true;}
function err(res:Response,e:any){const m:any={NETWORK_NOT_FOUND:404,AFFILIATE_CREDENTIALS_KEY_INVALID:500,CREDENTIALS_NOT_CONFIGURED:404};const c=e?.message||'NETWORK_CREDENTIALS_ERROR';res.status(m[c]||500).json({success:false,error:c,requestId:(res.req as any)?.requestId});}
export const affiliateNetworkSecurityController={
 async set(req:Request,res:Response){if(!guard(req,res))return;try{res.json({success:true,...await s.setCredentials(req.params.id,req.body?.credentials||{})});}catch(e){err(res,e);}},
 async clear(req:Request,res:Response){if(!guard(req,res))return;try{res.json({success:true,...await s.clearCredentials(req.params.id)});}catch(e){err(res,e);}},
 async test(req:Request,res:Response){if(!guard(req,res))return;try{const c=await s.getCredentials(req.params.id);res.json({success:true,configured:Boolean(c),message:'Credenciais descriptografadas apenas em memória para o teste.'});}catch(e){err(res,e);}}
};