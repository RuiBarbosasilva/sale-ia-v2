import { GoogleGenAI } from '@google/genai';
import { prisma } from '../modules/mercadoLivre/lib/prisma';

const apiKey = process.env.GEMINI_API_KEY || '';
const model = process.env.SALES_AI_MODEL || process.env.GEMINI_MODEL || 'gemini-3.6-flash';
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;
let initialized = false;

async function init() {
  if (initialized) return;
  await (prisma as any).$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "SalesConversation" (
      "id" TEXT PRIMARY KEY NOT NULL, "leadId" TEXT, "channel" TEXT NOT NULL DEFAULT 'WEB',
      "context" TEXT,
      "stage" TEXT NOT NULL DEFAULT 'NEW', "temperature" TEXT NOT NULL DEFAULT 'COLD',
      "intentScore" REAL NOT NULL DEFAULT 0, "objection" TEXT, "lastIntent" TEXT,
      "nextBestAction" TEXT, "status" TEXT NOT NULL DEFAULT 'OPEN',
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS "SalesConversationMessage" (
      "id" TEXT PRIMARY KEY NOT NULL, "conversationId" TEXT NOT NULL, "role" TEXT NOT NULL,
      "content" TEXT NOT NULL, "intent" TEXT, "objection" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS "SalesFollowUp" (
      "id" TEXT PRIMARY KEY NOT NULL, "conversationId" TEXT NOT NULL, "scheduledAt" DATETIME NOT NULL,
      "reason" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'PENDING', "draft" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS "SalesAction" (
      "id" TEXT PRIMARY KEY NOT NULL, "conversationId" TEXT NOT NULL, "type" TEXT NOT NULL,
      "title" TEXT NOT NULL, "payload" TEXT, "requiresApproval" INTEGER NOT NULL DEFAULT 1,
      "status" TEXT NOT NULL DEFAULT 'PENDING_APPROVAL', "approvedAt" DATETIME, "sentAt" DATETIME, "decisionNote" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS "SalesObjection" (
      "id" TEXT PRIMARY KEY NOT NULL, "conversationId" TEXT NOT NULL, "type" TEXT NOT NULL,
      "rawText" TEXT NOT NULL, "responseStrategy" TEXT, "resolved" INTEGER NOT NULL DEFAULT 0,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  initialized = true;
}
function id(){ return crypto.randomUUID(); }
function clamp(n:number){ return Math.max(0,Math.min(100,n)); }
function classify(text:string){
  const t=text.toLowerCase();
  const rules:[string,string[]][]=[
    ['PRICE',['caro','preço','valor','barato','desconto']],['TIME',['depois','agora não','mês que vem','tempo']],
    ['TRUST',['confiável','confio','medo','seguro','garantia']],['AUTHORITY',['sócio','gerente','marido','esposa','decidir']],
    ['COMPETITOR',['concorrente','outra empresa','outro fornecedor']],['NEED',['não preciso','não tenho interesse','não preciso disso']]
  ];
  return rules.find(([_,words])=>words.some(w=>t.includes(w)))?.[0] || null;
}
function intent(text:string){
  const t=text.toLowerCase(); let score=0; const signals=['quanto','preço','valor','como funciona','prazo','pagamento','comprar','fechar','contratar','link','proposta','quando começa'];
  signals.forEach(s=>{if(t.includes(s)) score+=12});
  if(/vou pensar|depois|talvez/.test(t)) score-=8;
  return clamp(score);
}
function temperature(score:number){ return score>=70?'VERY_HOT':score>=45?'HOT':score>=20?'WARM':'COLD'; }
function stage(text:string,score:number){
  const t=text.toLowerCase();
  if(/comprar|fechar|contratar|pagamento|checkout/.test(t)) return 'CLOSING';
  if(score>=45) return 'OFFER';
  if(/problema|preciso|quero|busco|procuro/.test(t)) return 'DISCOVERY';
  return 'QUALIFYING';
}

async function aiReply(context:string){
  if(!ai) return null;
  try {
    const interaction = await (ai as any).interactions.create({
      model, input: context,
      system_instruction: `Você é o Vendedor Sênior do SALE-IA-V2. Venda de forma consultiva, ética e objetiva. Descubra necessidade antes de empurrar oferta. Nunca invente preço, prazo, garantia, estoque, resultado ou prova. Não use pressão enganosa, medo ou falsa escassez. Para objeções: reconhecer -> investigar -> responder com evidência disponível -> propor próximo passo. Quando houver sinal de compra, conduza ao fechamento. Responda em português brasileiro. Retorne JSON puro com: reply, intent, objection, nextBestAction, confidence, escalationRequired.`
    });
    const text=String(interaction?.output_text||'').trim();
    if(!text) return null;
    const cleaned=text.replace(/^\\`\\`\\`json/i,'').replace(/\\`\\`\\`$/,'').trim();
    try{return JSON.parse(cleaned)}catch{return {reply:text,intent:'UNKNOWN',objection:null,nextBestAction:'REVIEW',confidence:50,escalationRequired:false};}
  } catch { return null; }
}

export const seniorSalesAgentService = {
  async createConversation(input:any){
    await init(); const conversationId=id();
    await (prisma as any).$executeRawUnsafe('ALTER TABLE "SalesConversation" ADD COLUMN "context" TEXT').catch(()=>{});
    await (prisma as any).$executeRawUnsafe('INSERT INTO "SalesConversation" ("id","leadId","channel","context") VALUES (?,?,?,?)',conversationId,input.leadId||null,input.channel||'WEB',input.context?JSON.stringify(input.context):null);
    return this.getConversation(conversationId);
  },
  async getConversation(idv:string){ await init(); const c=await (prisma as any).$queryRawUnsafe('SELECT * FROM "SalesConversation" WHERE id=?',idv); if(!c[0]) throw new Error('SALES_CONVERSATION_NOT_FOUND'); const messages=await (prisma as any).$queryRawUnsafe('SELECT * FROM "SalesConversationMessage" WHERE conversationId=? ORDER BY createdAt ASC',idv); const objections=await (prisma as any).$queryRawUnsafe('SELECT * FROM "SalesObjection" WHERE conversationId=? ORDER BY createdAt DESC',idv); const followUps=await (prisma as any).$queryRawUnsafe('SELECT * FROM "SalesFollowUp" WHERE conversationId=? ORDER BY scheduledAt ASC',idv); return {...c[0],messages,objections,followUps}; },
  async respond(conversationId:string, input:any){
    await init(); const c=await this.getConversation(conversationId); const customer=String(input.message||'').trim(); if(!customer) throw new Error('MESSAGE_REQUIRED');
    const localIntent=intent(customer), obj=classify(customer), temp=temperature(localIntent), st=stage(customer,localIntent);
    await (prisma as any).$executeRawUnsafe('INSERT INTO "SalesConversationMessage" ("id","conversationId","role","content","intent","objection") VALUES (?,?,?,?,?,?)',id(),conversationId,'CUSTOMER',customer,String(localIntent),obj);
    if(obj) await (prisma as any).$executeRawUnsafe('INSERT INTO "SalesObjection" ("id","conversationId","type","rawText") VALUES (?,?,?,?)',id(),conversationId,obj,customer);
    let commercialContext:any=null; try{commercialContext=c.context?JSON.parse(c.context):null;}catch{commercialContext=null;}
    const context=JSON.stringify({conversation:c,messages:c.messages.slice(-12),commercialContext,customerMessage:customer,detectedIntent:localIntent,detectedObjection:obj});
    const ai=await aiReply(context);
    const reply=ai?.reply || this.fallback(customer,obj,localIntent);
    const next=ai?.nextBestAction || (localIntent>=60?'ASK_FOR_CLOSE':obj?'INVESTIGATE_OBJECTION':'DISCOVER_NEED');
    const confidence=Number(ai?.confidence||65);
    await (prisma as any).$executeRawUnsafe('INSERT INTO "SalesConversationMessage" ("id","conversationId","role","content","intent","objection") VALUES (?,?,?,?,?,?)',id(),conversationId,'AGENT_DRAFT',reply,String(ai?.intent||localIntent),obj);
    await (prisma as any).$executeRawUnsafe('UPDATE "SalesConversation" SET "stage"=?,"temperature"=?,"intentScore"=?,"objection"=?,"lastIntent"=?,"nextBestAction"=?,"updatedAt"=CURRENT_TIMESTAMP WHERE id=?',st,temp,localIntent,obj,ai?.intent||String(localIntent),next,conversationId);
    await (prisma as any).$executeRawUnsafe('INSERT INTO "SalesAction" ("id","conversationId","type","title","payload") VALUES (?,?,?,?,?)',id(),conversationId,'SEND_MESSAGE','Enviar resposta comercial',JSON.stringify({reply,confidence,escalationRequired:Boolean(ai?.escalationRequired)}));
    return {conversationId,reply,stage:st,temperature:temp,intentScore:localIntent,objection:obj,nextBestAction:next,confidence,requiresApproval:true,escalationRequired:Boolean(ai?.escalationRequired)};
  },
  fallback(customer:string,obj:string|null,score:number){
    if(obj==='PRICE') return 'Entendo. Antes de falar em preço, quero evitar te indicar algo que não faça sentido. O que pesa mais para você: o valor inicial, o custo mensal ou o retorno esperado?';
    if(obj==='TIME') return 'Sem problema. Para eu não insistir sem necessidade: o que precisa acontecer antes de você avaliar isso novamente?';
    if(obj==='TRUST') return 'Faz sentido verificar isso antes de decidir. Posso te apresentar as informações, condições e evidências disponíveis para você avaliar com segurança. O que você gostaria de confirmar primeiro?';
    if(obj==='AUTHORITY') return 'Perfeito. Posso organizar uma proposta objetiva para você apresentar ao responsável pela decisão. Qual é o principal critério que essa pessoa vai avaliar?';
    if(score>=60) return 'Pelo que você me contou, parece que existe uma necessidade concreta. Posso te mostrar a opção mais adequada e, se fizer sentido, avançamos para a contratação?';
    return 'Entendi. Para eu não te oferecer algo genérico: qual é o principal problema que você quer resolver hoje?';
  },
  async prepareInitialApproach(conversationId:string){
    await init();
    const c=await this.getConversation(conversationId);
    let commercialContext:any=null; try{commercialContext=c.context?JSON.parse(c.context):null;}catch{commercialContext=null;}
    const prompt=JSON.stringify({task:'PREPARE_INITIAL_COMMERCIAL_APPROACH',commercialContext,conversation:{channel:c.channel,stage:c.stage,temperature:c.temperature}});
    const aiResult=await aiReply(prompt);
    const company=commercialContext?.prospect?.companyName||'sua empresa';
    const reply=aiResult?.reply || (commercialContext?.prospect?.currentWebsite
      ? 'Olá! Aqui é da RB Factory Sites. Analisei a presença digital da '+company+' e identifiquei alguns pontos que podem melhorar a forma como clientes encontram e conhecem a empresa. Preparei uma demonstração específica para vocês. Posso te mostrar?'
      : 'Olá! Aqui é da RB Factory Sites. Identifiquei a '+company+' em nossa pesquisa e preparei uma demonstração de site profissional pensada para o negócio. Posso te mostrar?');
    const confidence=Number(aiResult?.confidence||70);
    await (prisma as any).$executeRawUnsafe('INSERT INTO "SalesConversationMessage" ("id","conversationId","role","content","intent","objection") VALUES (?,?,?,?,?,?)',id(),conversationId,'AGENT_DRAFT',reply,'OUTREACH',null);
    await (prisma as any).$executeRawUnsafe('INSERT INTO "SalesAction" ("id","conversationId","type","title","payload") VALUES (?,?,?,?,?)',id(),conversationId,'SEND_MESSAGE','Enviar primeira abordagem comercial',JSON.stringify({reply,confidence,requiresApproval:true}));
    await (prisma as any).$executeRawUnsafe('UPDATE "SalesConversation" SET "nextBestAction"=\'SEND_FIRST_APPROACH\',"updatedAt"=CURRENT_TIMESTAMP WHERE id=?',conversationId);
    return {conversationId,reply,confidence,requiresApproval:true,nextBestAction:'SEND_FIRST_APPROACH'};
  },
  async approveAction(actionId:string){
    await init();
    const rows=await (prisma as any).$queryRawUnsafe('SELECT * FROM "SalesAction" WHERE id=? LIMIT 1',actionId);
    const action=rows[0];
    if(!action) throw new Error('SALES_ACTION_NOT_FOUND');
    if(action.status!=='PENDING_APPROVAL') throw new Error('SALES_ACTION_NOT_PENDING');
    await (prisma as any).$executeRawUnsafe('UPDATE "SalesAction" SET status=\'APPROVED\' WHERE id=?',actionId);
    return (await (prisma as any).$queryRawUnsafe('SELECT * FROM "SalesAction" WHERE id=?',actionId))[0];
  },
  async markActionSent(actionId:string,metadata?:any){
    await init();
    const rows=await (prisma as any).$queryRawUnsafe('SELECT * FROM "SalesAction" WHERE id=? LIMIT 1',actionId);
    if(!rows[0]) throw new Error('SALES_ACTION_NOT_FOUND');
    if(rows[0].status!=='APPROVED') throw new Error('SALES_ACTION_NOT_APPROVED');
    await (prisma as any).$executeRawUnsafe('UPDATE "SalesAction" SET status=\'SENT\',sentAt=CURRENT_TIMESTAMP,decisionNote=? WHERE id=?',metadata?JSON.stringify(metadata):null,actionId);
    return (await (prisma as any).$queryRawUnsafe('SELECT * FROM "SalesAction" WHERE id=?',actionId))[0];
  },
  async rejectAction(actionId:string,reason?:string){
    await init();
    const rows=await (prisma as any).$queryRawUnsafe('SELECT * FROM "SalesAction" WHERE id=? LIMIT 1',actionId);
    if(!rows[0]) throw new Error('SALES_ACTION_NOT_FOUND');
    if(rows[0].status!=='PENDING_APPROVAL') throw new Error('SALES_ACTION_NOT_PENDING');
    const payload=JSON.stringify({rejectionReason:reason||'REJECTED_BY_OPERATOR',originalPayload:rows[0].payload?JSON.parse(rows[0].payload):null});
    await (prisma as any).$executeRawUnsafe('UPDATE "SalesAction" SET status=\'REJECTED\',payload=? WHERE id=?',payload,actionId);
    return (await (prisma as any).$queryRawUnsafe('SELECT * FROM "SalesAction" WHERE id=?',actionId))[0];
  },
  async scheduleRecommendedFollowUp(conversationId:string,result:any){
    await init();
    const reason=String(result?.nextBestAction||'FOLLOW_UP');
    const existing=await (prisma as any).$queryRawUnsafe('SELECT * FROM "SalesFollowUp" WHERE conversationId=? AND status=\'PENDING\' ORDER BY scheduledAt ASC LIMIT 1',conversationId);
    if(existing[0]) return {reused:true,followUp:existing[0]};
    const draft=String(result?.reply||'');
    const scheduledAt=new Date(Date.now()+(reason==='ASK_FOR_CLOSE'?86400000:reason==='INVESTIGATE_OBJECTION'?2*86400000:3*86400000));
    const followUp=await this.scheduleFollowUp(conversationId,{scheduledAt,reason,draft});
    return {reused:false,followUp};
  },
  async scheduleFollowUp(conversationId:string,input:any){ await init(); const when=new Date(input.scheduledAt||Date.now()+86400000); const reason=String(input.reason||'FOLLOW_UP'); const draft=String(input.draft||''); const idv=id(); await (prisma as any).$executeRawUnsafe('INSERT INTO "SalesFollowUp" ("id","conversationId","scheduledAt","reason","draft") VALUES (?,?,?,?,?)',idv,conversationId,when.toISOString(),reason,draft); return (prisma as any).$queryRawUnsafe('SELECT * FROM "SalesFollowUp" WHERE id=?',idv); },
  async dashboard(){ await init(); const q=async(sql:string)=>Number((await (prisma as any).$queryRawUnsafe(sql))[0]?.count||0); const [conversations,hot,pending,followups,objections]=await Promise.all([q('SELECT COUNT(*) count FROM "SalesConversation" WHERE status=\'OPEN\''),q('SELECT COUNT(*) count FROM "SalesConversation" WHERE temperature IN (\'HOT\',\'VERY_HOT\')'),q('SELECT COUNT(*) count FROM "SalesAction" WHERE status=\'PENDING_APPROVAL\''),q('SELECT COUNT(*) count FROM "SalesFollowUp" WHERE status=\'PENDING\''),q('SELECT COUNT(*) count FROM "SalesObjection" WHERE resolved=0')]); return {conversations,hotLeads:hot,pendingActions:pending,pendingFollowUps:followups,openObjections:objections,mode:'SENIOR_SALES_SUPERVISED'}; }
};
