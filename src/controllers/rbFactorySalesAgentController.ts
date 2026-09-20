import { Request, Response } from 'express';
import { rbFactorySalesAgentService } from '../services/rbFactorySalesAgentService';

export const rbFactorySalesAgentController={
  async errors(e:any,res:Response){
    const message=e?.message||'Erro interno';
    const status=['WEBSITE_PROSPECT_NOT_FOUND','SALES_CONVERSATION_NOT_FOUND'].includes(message)?404:['SALES_CONVERSATION_PROSPECT_MISMATCH'].includes(message)?409:500;
    res.status(status).json({success:false,error:message});
  },
  async dashboard(_req:Request,res:Response){try{res.json({success:true,...await rbFactorySalesAgentService.dashboard()});}catch(e){return rbFactorySalesAgentController.errors(e,res);}},
  async create(req:Request,res:Response){try{res.status(201).json({success:true,...await rbFactorySalesAgentService.createConversation(String(req.params.prospectId),String(req.body?.channel||'WHATSAPP'))});}catch(e){return rbFactorySalesAgentController.errors(e,res);}},
  async initialApproach(req:Request,res:Response){try{res.json({success:true,...await rbFactorySalesAgentService.prepareInitialApproach(String(req.params.prospectId),String(req.body?.channel||'WHATSAPP'))});}catch(e){return rbFactorySalesAgentController.errors(e,res);}},
  async respond(req:Request,res:Response){try{res.json({success:true,...await rbFactorySalesAgentService.respond(String(req.params.prospectId),String(req.params.conversationId),String(req.body?.message||''))});}catch(e){return rbFactorySalesAgentController.errors(e,res);}}
};
