import { Request, Response } from 'express';
import { affiliateIntelligenceService as s } from '../services/affiliateIntelligenceService';

function guard(req:Request,res:Response){
  const key=process.env.AFFILIATE_ADMIN_KEY;
  if(!key || req.header('x-affiliate-admin-key')!==key){res.status(401).json({success:false,error:'ADMIN_UNAUTHORIZED'});return false;}
  return true;
}
function err(res:Response,e:any){
  const map:any={NETWORK_NAME_REQUIRED:400,NETWORK_NOT_FOUND:404,PRODUCT_NOT_FOUND:404,CAMPAIGN_NOT_FOUND:404};
  const code=e?.message||'AFFILIATE_INTELLIGENCE_ERROR';
  return res.status(map[code]||500).json({success:false,error:code});
}
export const affiliateIntelligenceController={
  async bootstrap(req:Request,res:Response){if(!guard(req,res))return;try{res.json({success:true,networks:await s.bootstrapNetworks()});}catch(e){err(res,e);}},
  async dashboard(req:Request,res:Response){if(!guard(req,res))return;try{res.json({success:true,...await s.dashboard()});}catch(e){err(res,e);}},
  async networks(req:Request,res:Response){if(!guard(req,res))return;try{res.json({success:true,networks:await s.listNetworks()});}catch(e){err(res,e);}},
  async createNetwork(req:Request,res:Response){if(!guard(req,res))return;try{res.status(201).json({success:true,network:await s.createNetwork(req.body||{})});}catch(e){err(res,e);}},
  async updateNetwork(req:Request,res:Response){if(!guard(req,res))return;try{res.json({success:true,network:await s.updateNetwork(req.params.id,req.body||{})});}catch(e){err(res,e);}},
  async ingestProducts(req:Request,res:Response){if(!guard(req,res))return;try{res.json({success:true,result:await s.ingestProducts(req.params.id,req.body?.products||[])});}catch(e){err(res,e);}},
  async products(req:Request,res:Response){if(!guard(req,res))return;try{res.json({success:true,products:await s.topProducts(Number(req.query.take||50))});}catch(e){err(res,e);}},
  async opportunities(req:Request,res:Response){if(!guard(req,res))return;try{res.json({success:true,opportunities:await s.opportunities(req.query.status as string|undefined)});}catch(e){err(res,e);}},
  async autonomyPlan(req:Request,res:Response){if(!guard(req,res))return;try{res.json({success:true,plan:await s.createAutonomyPlan()});}catch(e){err(res,e);}},
  async createCampaign(req:Request,res:Response){if(!guard(req,res))return;try{res.status(201).json({success:true,campaign:await s.createCampaign(req.body||{})});}catch(e){err(res,e);}},
  async generateContent(req:Request,res:Response){if(!guard(req,res))return;try{res.status(201).json({success:true,content:await s.generateContent(req.params.id,req.body?.platforms)});}catch(e){err(res,e);}}
};
