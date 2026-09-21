import { Request, Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../modules/mercadoLivre/lib/prisma';
import { rbFactorySalesAgentService } from '../services/rbFactorySalesAgentService';
import { rbFactorySalesAutonomyService } from '../services/rbFactorySalesAutonomyService';

function normalizePhone(v:any){ return String(v||'').replace(/\D/g,''); }
function webhookEventKey(req:Request,phone:string,message:string){
  const body:any=req.body||{};
  const explicit=body.eventId||body.eventID||body.messageId||body.messageID||body.key?.id||body.data?.key?.id||body.data?.messageId||body.data?.eventId;
  if(explicit) return 'provider:'+String(explicit);
  // Providers without a stable event id can legitimately deliver the same text again later.
  // Keep the fallback dedupe bounded to a short time bucket instead of suppressing that text forever.
  const bucket=Math.floor(Date.now()/(5*60*1000));
  return 'content:'+crypto.createHash('sha256').update(JSON.stringify({phone,message,bucket})).digest('hex');
}

export const rbFactoryWhatsAppController = {
  async webhook(req:Request,res:Response){
    try{
      const configuredSecret=String(process.env.RB_FACTORY_WHATSAPP_WEBHOOK_SECRET||'').trim();
      const isProduction=String(process.env.NODE_ENV||'').toLowerCase()==='production';
      if(isProduction && !configuredSecret) return res.status(503).json({success:false,error:'WEBHOOK_SECRET_NOT_CONFIGURED'});
      if(configuredSecret){
        const provided=String(req.header('x-rb-factory-webhook-secret')||req.header('x-webhook-secret')||'').trim();
        if(!provided || provided!==configuredSecret) return res.status(401).json({success:false,error:'WEBHOOK_UNAUTHORIZED'});
      }
      const phone=normalizePhone(req.body?.phone || req.body?.from || req.body?.sender);
      const message=String(req.body?.message || req.body?.text || req.body?.body || '').trim();
      const eventKey=webhookEventKey(req,phone,message);
      const name=req.body?.name || req.body?.pushName || null;
      if(!phone || !message) return res.status(400).json({success:false,error:'PHONE_AND_MESSAGE_REQUIRED'});
      await (prisma as any).$executeRawUnsafe('CREATE TABLE IF NOT EXISTS "RbFactoryWhatsAppEvent" ("eventKey" TEXT PRIMARY KEY NOT NULL, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)');
      try{
        await (prisma as any).$executeRawUnsafe('INSERT INTO "RbFactoryWhatsAppEvent" ("eventKey") VALUES (?)',eventKey);
      }catch{
        return res.json({success:true,handled:true,deduplicated:true,eventKey});
      }

      const prospects=await (prisma as any).$queryRawUnsafe(
        'SELECT id FROM "WebsiteProspect" WHERE REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(phone,\'\'),\'-\',\'\'),\'(\',\'\'),\')\',\'\'),\' \',\'\'),\'+\',\'\') LIKE ? LIMIT 5',
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
      const action=result?.result?.action || null;
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
