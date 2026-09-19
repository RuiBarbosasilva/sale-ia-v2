import { Request, Response } from 'express';
import { braipService } from '../services/braipService';
export const braipController={
 async status(_req:Request,res:Response){try{res.json({success:true,...await braipService.status()});}catch(e:any){res.status(500).json({success:false,error:e.message});}},
 async importProducts(req:Request,res:Response){try{if(!Array.isArray(req.body?.products))return res.status(400).json({success:false,error:'PRODUCTS_ARRAY_REQUIRED'});res.json({success:true,...await braipService.importProducts(req.body.products)});}catch(e:any){res.status(500).json({success:false,error:e.message});}}
};