import { Request, Response } from 'express';
import { editorialFactoryService } from '../services/editorialFactoryService';

export async function research(req:Request,res:Response){ try{res.json({success:true,...await editorialFactoryService.research(req.body)});}catch(e:any){res.status(400).json({success:false,error:e?.message||'EDITORIAL_RESEARCH_ERROR'});} }
export async function opportunities(req:Request,res:Response){ try{res.json({success:true,data:await editorialFactoryService.listOpportunities(Number(req.query.limit||50))});}catch(e:any){res.status(500).json({success:false,error:e?.message});} }
export async function createProject(req:Request,res:Response){ try{res.status(201).json({success:true,data:await editorialFactoryService.createProject(req.body)});}catch(e:any){res.status(400).json({success:false,error:e?.message});} }
export async function generate(req:Request,res:Response){ try{res.json({success:true,data:await editorialFactoryService.generate(req.params.id)});}catch(e:any){res.status(400).json({success:false,error:e?.message});} }
export async function qualityGate(req:Request,res:Response){ try{res.json({success:true,data:await editorialFactoryService.qualityGate(req.params.id)});}catch(e:any){res.status(400).json({success:false,error:e?.message});} }
export async function render(req:Request,res:Response){ try{res.json({success:true,data:await editorialFactoryService.render(req.params.id)});}catch(e:any){res.status(400).json({success:false,error:e?.message});} }
export async function landing(req:Request,res:Response){ try{res.json({success:true,data:await editorialFactoryService.createLandingPage(req.params.id,req.body?.checkoutUrl)});}catch(e:any){res.status(400).json({success:false,error:e?.message});} }
export async function publishPlan(req:Request,res:Response){ try{res.json({success:true,data:await editorialFactoryService.publishPlan(req.params.id)});}catch(e:any){res.status(400).json({success:false,error:e?.message});} }
