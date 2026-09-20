import { Request, Response } from 'express';
import { rbFactorySalesService } from '../services/rbFactorySalesService';

export const rbFactorySalesController={
  async errors(e:any,res:Response){
    const message=e?.message||'Erro interno';
    const status=['WEBSITE_PROSPECT_NOT_FOUND','WEBSITE_PROPOSAL_NOT_FOUND','RB_FACTORY_PIPELINE_NOT_FOUND'].includes(message)?404
      :['WEBSITE_PROPOSAL_NOT_READY','WEBSITE_PROPOSAL_NOT_ACCEPTABLE','DEMO_NOT_READY_FOR_PROJECT','INVALID_PIPELINE_STAGE','INVALID_PIPELINE_TRANSITION','PROPOSAL_NOT_ACCEPTED','WEBSITE_PROJECT_NOT_READY'].includes(message)?409:500;
    res.status(status).json({success:false,error:message});
  },
  async list(_req:Request,res:Response){res.json({success:true,pipelines:await rbFactorySalesService.list()});},
  async create(req:Request,res:Response){try{res.json({success:true,pipeline:await rbFactorySalesService.createFromProspect(String(req.params.prospectId))});}catch(e){return rbFactorySalesController.errors(e,res);}},
  async models(req:Request,res:Response){res.json({success:true,models:await rbFactorySalesService.models(String(req.params.prospectId))});},
  async demo(req:Request,res:Response){try{res.json({success:true,...await rbFactorySalesService.buildDemo(String(req.params.prospectId),{niche:req.body?.niche,modelIndex:req.body?.modelIndex})});}catch(e){return rbFactorySalesController.errors(e,res);}},
  async proposal(req:Request,res:Response){try{res.json({success:true,proposal:await rbFactorySalesService.buildProposal(String(req.params.prospectId),req.body?.planCode,req.body?.planId)});}catch(e){return rbFactorySalesController.errors(e,res);}},
  async sendProposal(req:Request,res:Response){try{res.json({success:true,proposal:await rbFactorySalesService.sendProposal(String(req.params.prospectId))});}catch(e){return rbFactorySalesController.errors(e,res);}},
  async convertLead(req:Request,res:Response){try{res.json({success:true,lead:await rbFactorySalesService.convertToLead(String(req.params.prospectId))});}catch(e){return rbFactorySalesController.errors(e,res);}},
  async acceptProposal(req:Request,res:Response){try{res.json({success:true,...await rbFactorySalesService.acceptProposal(String(req.params.prospectId),req.body?.domainName)});}catch(e){return rbFactorySalesController.errors(e,res);}},
  async stage(req:Request,res:Response){try{res.json({success:true,pipeline:await rbFactorySalesService.updateStage(String(req.params.id),String(req.body.stage||''),req.body.nextAction,req.body.notes)});}catch(e){return rbFactorySalesController.errors(e,res);}}
};
