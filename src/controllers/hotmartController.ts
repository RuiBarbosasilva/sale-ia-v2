import {Request,Response} from 'express';
import {prisma} from '../modules/mercadoLivre/lib/prisma';
import {hotmartAdapter} from '../services/hotmartAdapter';
import {affiliateIntelligenceService} from '../services/affiliateIntelligenceService';

function guard(req:Request,res:Response){
  const key=process.env.AFFILIATE_ADMIN_KEY;
  if(!key || req.header('x-affiliate-admin-key')!==key){
    res.status(401).json({success:false,error:'ADMIN_UNAUTHORIZED'});
    return false;
  }
  return true;
}
function err(res:Response,e:any){
  const status=Number(e?.status)||500;
  const code=e?.message||'HOTMART_ERROR';
  res.status(status>=400&&status<600?status:500).json({success:false,error:code,details:e?.body||undefined});
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
        maxResults:Number(req.query.maxResults||50),
        status:req.query.status?String(req.query.status):undefined,
        format:req.query.format?String(req.query.format):undefined
      });
      const ingest=await affiliateIntelligenceService.ingestProducts(network.id,result.products);
      res.json({success:true,source:'hotmart',ingest,items:result.products,pageInfo:result.pageInfo});
    }catch(e){err(res,e);}
  },
  async sales(req:Request,res:Response){
    if(!guard(req,res)) return;
    try{
      const network=await prisma.affiliateNetwork.findUnique({where:{slug:'hotmart'}});
      if(!network) return res.status(404).json({success:false,error:'HOTMART_NETWORK_NOT_BOOTSTRAPPED'});
      const result=await hotmartAdapter.salesHistory(network.id,{maxResults:Number(req.query.maxResults||50),pageToken:req.query.pageToken?String(req.query.pageToken):undefined});
      res.json({success:true,source:'hotmart',...result});
    }catch(e){err(res,e);}
  }
};
