import { Request, Response } from 'express';
import { rbFactorySalesService } from '../services/rbFactorySalesService';
import { proposalGeneratorService } from '../services/proposalGeneratorService';
import { RB_FACTORY_COMMERCIAL, getInitialCommercialPlan, getLaunchOffer } from '../config/rbFactoryCommercial';

export const rbFactorySalesController={
  async errors(e:any,res:Response){
    const message=e?.message||'Erro interno';
    const status=['WEBSITE_PROSPECT_NOT_FOUND','WEBSITE_PROPOSAL_NOT_FOUND','RB_FACTORY_PIPELINE_NOT_FOUND'].includes(message)?404
      :['WEBSITE_PROPOSAL_NOT_READY','WEBSITE_PROPOSAL_NOT_ACCEPTABLE','DEMO_NOT_READY_FOR_PROJECT','DEMO_NOT_READY_FOR_PROPOSAL','DEMO_NOT_READY_FOR_PIPELINE','PROPOSAL_NOT_READY_FOR_SENDING','PROPOSAL_ACCEPTANCE_IN_PROGRESS','PROPOSAL_SNAPSHOT_MISSING','WEBSITE_PLAN_SNAPSHOT_INVALID','INVALID_COMMERCIAL_STATE','INVALID_PIPELINE_STAGE','INVALID_PIPELINE_TRANSITION','PROPOSAL_NOT_ACCEPTED','WEBSITE_PROJECT_NOT_READY'].includes(message) || message.startsWith('DEMO_QUALITY_GATE') || message.startsWith('DEMO_NOT_READY') || message.startsWith('LEAD_PHONE_REQUIRED') || message.startsWith('PUBLICATION_STATE_SYNC_FAILED') || ['DEPLOYMENT_ALREADY_IN_PROGRESS','DEPLOYMENT_RECOVERY_REQUIRED','DEPLOYMENT_RECOVERY_PENDING','DEPLOYMENT_URL_NOT_VERIFIED','VERCEL_TOKEN_NOT_CONFIGURED','DEPLOYMENT_PROVIDER_NOT_SUPPORTED'].includes(message) ?409:500;
    res.status(status).json({success:false,error:message});
  },
  async list(_req:Request,res:Response){res.json({success:true,pipelines:await rbFactorySalesService.list()});},
  async create(req:Request,res:Response){try{res.json({success:true,pipeline:await rbFactorySalesService.createFromProspect(String(req.params.prospectId))});}catch(e){return rbFactorySalesController.errors(e,res);}},
  async models(req:Request,res:Response){res.json({success:true,models:await rbFactorySalesService.models(String(req.params.prospectId))});},
  async plans(_req:Request,res:Response){try{res.json({success:true,plans:await proposalGeneratorService.listPlans()});}catch(e){return rbFactorySalesController.errors(e,res);}},
  async presentation(_req:Request,res:Response){
    res.json({
      success:true,
      brand:RB_FACTORY_COMMERCIAL.brand,
      presentation:RB_FACTORY_COMMERCIAL.presentation,
      payment:RB_FACTORY_COMMERCIAL.payment,
      initialOffer:getInitialCommercialPlan(),
      comparison:RB_FACTORY_COMMERCIAL.plans,
      launchOffer:getLaunchOffer(),
      whatsapp:RB_FACTORY_COMMERCIAL.whatsapp,
    });
  },
  async demo(req:Request,res:Response){try{res.json({success:true,...await rbFactorySalesService.buildDemo(String(req.params.prospectId),{niche:req.body?.niche,modelIndex:req.body?.modelIndex})});}catch(e){return rbFactorySalesController.errors(e,res);}},
  async proposal(req:Request,res:Response){try{res.json({success:true,proposal:await rbFactorySalesService.buildProposal(String(req.params.prospectId),req.body?.planCode,req.body?.planId)});}catch(e){return rbFactorySalesController.errors(e,res);}},
  async sendProposal(req:Request,res:Response){try{res.json({success:true,proposal:await rbFactorySalesService.sendProposal(String(req.params.prospectId))});}catch(e){return rbFactorySalesController.errors(e,res);}},
  async convertLead(req:Request,res:Response){try{res.json({success:true,lead:await rbFactorySalesService.convertToLead(String(req.params.prospectId))});}catch(e){return rbFactorySalesController.errors(e,res);}},
  async acceptProposal(req:Request,res:Response){try{res.json({success:true,...await rbFactorySalesService.acceptProposal(String(req.params.prospectId),req.body?.domainName)});}catch(e){return rbFactorySalesController.errors(e,res);}},
  async stage(req:Request,res:Response){try{res.json({success:true,pipeline:await rbFactorySalesService.updateStage(String(req.params.id),String(req.body.stage||''),req.body.nextAction,req.body.notes)});}catch(e){return rbFactorySalesController.errors(e,res);}}
};
