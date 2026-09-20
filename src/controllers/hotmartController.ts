import {Request,Response} from 'express';
import {prisma} from '../modules/mercadoLivre/lib/prisma';
import {hotmartAdapter} from '../services/hotmartAdapter';
import {affiliateIntelligenceService} from '../services/affiliateIntelligenceService';
import {timingSafeSecret} from '../middlewares/security';

function guard(req:Request,res:Response){
  const key=process.env.AFFILIATE_ADMIN_KEY;
  if(!timingSafeSecret(key,req.header('x-affiliate-admin-key'))){
    res.status(401).json({success:false,error:'ADMIN_UNAUTHORIZED'});
    return false;
  }
  return true;
}
function err(res:Response,e:any){
  const status=Number(e?.status)||500;
  const message=e?.message;
  const code=typeof message==='string'&&/^[A-Z0-9_.-]{1,80}$/.test(message)?message:'HOTMART_ERROR';
  const safeStatus=Number.isInteger(status)&&status>=400&&status<600?status:500;
  res.status(safeStatus).json({success:false,error:code,requestId:(res.req as any)?.requestId});
}

function bounded(value:unknown,fallback:number,max:number){
  if(value===undefined)return fallback;
  const n=Number(value);
  if(!Number.isInteger(n)||n<1||n>max)throw new Error('INVALID_MAX_RESULTS');
  return n;
}

export const hotmartController={
  async test(req:Request,res:Response){
    if(!guard(req,res)) return;
    try{
      const network=await prisma.affiliateNetwork.findUnique({where:{slug:'hotmart'}});
      if(!network) return res.status(404).json({success:false,error:'HOTMART_NETWORK_NOT_BOOTSTRAPPED'});
      res.json({success:true,...await hotmartAdapter.test(network.id)});
    }catch(e){err(res,e);}
  },
  async products(req:Request,res:Response){
    if(!guard(req,res)) return;
    try{
      const network=await prisma.affiliateNetwork.findUnique({where:{slug:'hotmart'}});
      if(!network) return res.status(404).json({success:false,error:'HOTMART_NETWORK_NOT_BOOTSTRAPPED'});
      const result=await hotmartAdapter.syncProducts(network.id,{
        maxResults:bounded(req.query.maxResults,50,100),
        status:req.query.status?String(req.query.status):undefined,
        format:req.query.format?String(req.query.format):undefined
      });
      const ingest=await affiliateIntelligenceService.ingestProducts(network.id,result.products);
      res.json({success:true,source:'hotmart',scope:'PRODUCER_PRODUCTS',note:'Este endpoint da Hotmart lista produtos do produtor, não o Marketplace de afiliados.',ingest,items:result.products,pageInfo:result.pageInfo});
    }catch(e){err(res,e);}
  },
  async sales(req:Request,res:Response){
    if(!guard(req,res)) return;
    try{
      const network=await prisma.affiliateNetwork.findUnique({where:{slug:'hotmart'}});
      if(!network) return res.status(404).json({success:false,error:'HOTMART_NETWORK_NOT_BOOTSTRAPPED'});
      const result=await hotmartAdapter.salesHistory(network.id,{maxResults:bounded(req.query.maxResults,50,100),pageToken:req.query.pageToken?String(req.query.pageToken).slice(0,500):undefined,commissionAs:req.query.commissionAs?String(req.query.commissionAs):'AFFILIATE'});
      res.json({success:true,source:'hotmart',scope:'SALES_HISTORY',commissionAs:result.commissionAs||'AFFILIATE',...result});
    }catch(e){err(res,e);}
  }
};
