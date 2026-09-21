import { Request, Response } from 'express';
import { prisma } from '../modules/mercadoLivre/lib/prisma';
import { rbFactorySalesAgentService } from '../services/rbFactorySalesAgentService';
import { rbFactorySalesAutonomyService } from '../services/rbFactorySalesAutonomyService';

function normalizePhone(v:any){ return String(v||'').replace(/\\D/g,''); }

export const rbFactoryWhatsAppController = {
  async webhook(req:Request,res:Response){
    try{
      const phone=normalizePhone(req.body?.phone || req.body?.from || req.body?.sender);
      const message=String(req.body?.message || req.body?.text || req.body?.body || '').trim();
      const name=req.body?.name || req.body?.pushName || null;
      if(!phone || !message) return res.status(400).json({success:false,error:'PHONE_AND_MESSAGE_REQUIRED'});

      const prospects=await (prisma as any).$queryRawUnsafe(
        'SELECT id FROM "WebsiteProspect" WHERE REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(phone,\'\'),\'\\\\\',\'\'),\'-\',\'\'),\'(\',\'\'),\')\',\'\') LIKE ? LIMIT 5',
        '%' + phone.slice(-8)
      );
      const prospectId=prospects[0]?.id;
      if(!prospectId){
        return res.json({success:true,handled:false,reason:'PROSPECT_NOT_FOUND',phone,name});
      }

      const conversation=await rbFactorySalesAgentService.ensureConversation(prospectId,'WHATSAPP');
      const result=await rbFactorySalesAgentService.respond(prospectId,conversation.conversation.id,message);

      let sent=false;
      let sendResult:any=null;
      const action=result?.result?.action || result?.result?.salesAction || null;
      if(action?.id && process.env.RB_FACTORY_SALES_MODE==='AUTONOMOUS' && process.env.RB_FACTORY_WHATSAPP_AUTOSEND==='true' && process.env.RB_FACTORY_WHATSAPP_OUTREACH_AUTHORIZED==='true'){
        try{
          sendResult=await rbFactorySalesAutonomyService.sendAction(action.id);
          sent=true;
        }catch(error:any){
          sendResult={sent:false,reason:error?.message||'SEND_FAILED'};
        }
      }

      return res.json({
        success:true,handled:true,prospectId,conversationId:conversation.conversation.id,
        response:result.result,followUp:result.followUp,sent,sendResult
      });
    }catch(error:any){
      return res.status(500).json({success:false,error:error?.message||'WHATSAPP_WEBHOOK_ERROR'});
    }
  }
};
