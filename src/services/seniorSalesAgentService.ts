import { GoogleGenAI } from '@google/genai';
import { prisma } from '../modules/mercadoLivre/lib/prisma';
import { RB_FACTORY_SALES_PSYCHOLOGY } from '../config/rbFactorySalesPsychology';

const apiKey = process.env.GEMINI_API_KEY || '';
const model = process.env.SALES_AI_MODEL || process.env.GEMINI_MODEL || 'gemini-3.6-flash';
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;
let initialized = false;
const salesLocks = new Map<string, Promise<void>>();

async function withSalesLock<T>(key:string, work:()=>Promise<T>):Promise<T>{
  const previous=salesLocks.get(key)||Promise.resolve();
  let release!:()=>void;
  const current=new Promise<void>(resolve=>{release=resolve;});
  salesLocks.set(key,current);
  await previous;
  try{return await work();}finally{release();if(salesLocks.get(key)===current)salesLocks.delete(key);}
}

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
  await (prisma as any).$executeRawUnsafe('ALTER TABLE "SalesAction" ADD COLUMN "approvedAt" DATETIME').catch(()=>{});
  await (prisma as any).$executeRawUnsafe('ALTER TABLE "SalesAction" ADD COLUMN "sentAt" DATETIME').catch(()=>{});
  await (prisma as any).$executeRawUnsafe('ALTER TABLE "SalesAction" ADD COLUMN "decisionNote" TEXT').catch(()=>{});
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


function decisionPolicy(input:any){
  const score=Number(input.intentScore||0), temp=String(input.temperature||'COLD');
  const objection=input.objection?String(input.objection):null;
  const explicitNoInterest=/(não tenho interesse|nao tenho interesse|não quero|nao quero|não me interessa|nao me interessa|pare de|pode parar|retire meu contato)/i.test(String(input.message||''));
  const asksDemo=/(demo|demonstração|demonstracao|ver o site|link|mostrar)/i.test(String(input.message||''));
  const asksProposal=/(proposta|orçamento|orcamento|valor|preço|preco|condições|condicoes)/i.test(String(input.message||''));
  const ready=/(fechar|contratar|vamos fazer|pode fazer|quero contratar|como pago|pagamento)/i.test(String(input.message||''));
  if(explicitNoInterest) return {action:'STOP_OUTREACH',autonomyAllowed:false,escalationRequired:false,reason:'EXPLICIT_OPT_OUT',confidence:99};
  if(objection==='AUTHORITY') return {action:'DISCOVER_DECISION_MAKER',autonomyAllowed:true,escalationRequired:false,reason:'DECISION_AUTHORITY_UNCLEAR',confidence:94};
  if(objection==='PRICE' && ready) return {action:'ESCALATE_HUMAN_NEGOTIATION',autonomyAllowed:false,escalationRequired:true,reason:'PRICE_NEGOTIATION_NEAR_CLOSE',confidence:96};
  if(objection && objection!=='NEED') return {action:'INVESTIGATE_OBJECTION',autonomyAllowed:true,escalationRequired:false,reason:'OBJECTION_DETECTED',confidence:95};
  if(ready || score>=75 || temp==='VERY_HOT') return {action:'ASK_FOR_CLOSE',autonomyAllowed:true,escalationRequired:false,reason:'HIGH_PURCHASE_INTENT',confidence:95};
  if(asksProposal) return {action:'PREPARE_PROPOSAL',autonomyAllowed:true,escalationRequired:false,reason:'PROPOSAL_SIGNAL',confidence:93};
  if(asksDemo) return {action:'PREPARE_DEMO',autonomyAllowed:true,escalationRequired:false,reason:'DEMO_SIGNAL',confidence:92};
  if(score>=45 || temp==='HOT') return {action:'DISCOVER_NEED',autonomyAllowed:true,escalationRequired:false,reason:'QUALIFIED_INTEREST',confidence:88};
  return {action:'FOLLOW_UP',autonomyAllowed:true,escalationRequired:false,reason:'CONTINUE_DISCOVERY',confidence:82};
}

async function aiReply(context:string){
  if(!ai) return null;
  try {
    const interaction = await (ai as any).interactions.create({
      model, input: context,
      system_instruction: `Você é o Vendedor Sênior da RB Factory Sites dentro do SALE-IA-V2. Seu trabalho é conversar como um vendedor humano experiente, consultivo e persuasivo, sem parecer um robô ou um texto publicitário. Use diagnóstico, relevância, prova verificável, clareza cognitiva, compromisso progressivo e fechamento natural. Para objeções, acolha, investigue, isole a causa real, responda com evidência disponível e proponha apenas o próximo passo adequado. Use princípios de psicologia da decisão para reduzir fricção e facilitar uma decisão consciente, nunca para manipular, constranger ou enganar. Nunca invente preço, prazo, garantia, estoque, resultado, cliente, certificação ou prova. Não use falsa escassez, urgência inventada, medo, culpa ou pressão. Adapte vocabulário, tamanho das frases e nível de formalidade ao cliente e ao histórico da conversa. Faça no máximo uma pergunta principal por mensagem. Se o cliente estiver pronto, conduza objetivamente ao próximo passo; se estiver inseguro, descubra a barreira antes de oferecer desconto ou insistir. Responda em português brasileiro natural. Retorne JSON puro com: reply, intent, objection, nextBestAction, confidence, escalationRequired, persuasionStrategy, decisionBarrier.`
      + JSON.stringify(RB_FACTORY_SALES_PSYCHOLOGY)
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
    const context=JSON.stringify({conversation:c,messages:c.messages.slice(-12),commercialContext,customerMessage:customer,detectedIntent:localIntent,detectedObjection:obj,salesPsychology:RB_FACTORY_SALES_PSYCHOLOGY});
    const ai=await aiReply(context);
    const reply=ai?.reply || this.fallback(customer,obj,localIntent);
    const policy=decisionPolicy({message:customer,intentScore:localIntent,temperature:temp,objection:obj});
    const aiSuggested=String(ai?.nextBestAction||'');
    const allowedAi=new Set(['ASK_FOR_CLOSE','INVESTIGATE_OBJECTION','DISCOVER_NEED','SEND_FIRST_APPROACH','REVIEW']);
    const next=policy.escalationRequired ? policy.action : (allowedAi.has(aiSuggested) ? aiSuggested : policy.action);
    const confidence=Math.min(Number(ai?.confidence||65), Number(policy.confidence||100));
    await (prisma as any).$executeRawUnsafe('INSERT INTO "SalesConversationMessage" ("id","conversationId","role","content","intent","objection") VALUES (?,?,?,?,?,?)',id(),conversationId,'AGENT_DRAFT',reply,String(ai?.intent||localIntent),obj);
    await (prisma as any).$executeRawUnsafe('UPDATE "SalesConversation" SET "stage"=?,"temperature"=?,"intentScore"=?,"objection"=?,"lastIntent"=?,"nextBestAction"=?,"updatedAt"=CURRENT_TIMESTAMP WHERE id=?',st,temp,localIntent,obj,ai?.intent||String(localIntent),next,conversationId);
    const payload=JSON.stringify({reply,confidence,escalationRequired:Boolean(ai?.escalationRequired)||policy.escalationRequired,persuasionStrategy:ai?.persuasionStrategy||null,decisionBarrier:ai?.decisionBarrier||null,decisionPolicy:policy});
    const reusable=(await (prisma as any).$queryRawUnsafe('SELECT * FROM "SalesAction" WHERE conversationId=? AND type=\'SEND_MESSAGE\' AND title=\'Enviar resposta comercial\' AND status IN (\'PENDING_APPROVAL\',\'APPROVED\') ORDER BY createdAt DESC LIMIT 1',conversationId))[0];
    if(reusable) return {conversationId,reply:reusable.payload?JSON.parse(reusable.payload).reply:reply,stage:st,temperature:temp,intentScore:localIntent,objection:obj,nextBestAction:next,confidence,requiresApproval:true,reused:true,escalationRequired:Boolean(ai?.escalationRequired)||policy.escalationRequired,persuasionStrategy:ai?.persuasionStrategy||null,decisionBarrier:ai?.decisionBarrier||null,decisionPolicy:policy,action:reusable};
    const actionId=id();
    await (prisma as any).$executeRawUnsafe('INSERT INTO "SalesAction" ("id","conversationId","type","title","payload") VALUES (?,?,?,?,?)',actionId,conversationId,'SEND_MESSAGE','Enviar resposta comercial',payload);
    const action=(await (prisma as any).$queryRawUnsafe('SELECT * FROM "SalesAction" WHERE id=? LIMIT 1',actionId))[0];
    return {conversationId,reply,stage:st,temperature:temp,intentScore:localIntent,objection:obj,nextBestAction:next,confidence,requiresApproval:true,escalationRequired:Boolean(ai?.escalationRequired)||policy.escalationRequired,persuasionStrategy:ai?.persuasionStrategy||null,decisionBarrier:ai?.decisionBarrier||null,decisionPolicy:policy,action};
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
    return withSalesLock('initial-approach:'+conversationId, async()=>{
    await init();
    const existing=await (prisma as any).$queryRawUnsafe('SELECT * FROM "SalesAction" WHERE conversationId=? AND type=\'SEND_MESSAGE\' AND title=\'Enviar primeira abordagem comercial\' AND status IN (\'PENDING_APPROVAL\',\'APPROVED\',\'SENT\') ORDER BY createdAt DESC LIMIT 1',conversationId);
    if(existing[0]) return {conversationId,reused:true,action:existing[0],requiresApproval:true,nextBestAction:'SEND_FIRST_APPROACH'};
    const c=await this.getConversation(conversationId);
    let commercialContext:any=null; try{commercialContext=c.context?JSON.parse(c.context):null;}catch{commercialContext=null;}
    const prompt=JSON.stringify({task:'PREPARE_INITIAL_COMMERCIAL_APPROACH',commercialContext,conversation:{channel:c.channel,stage:c.stage,temperature:c.temperature},salesPsychology:RB_FACTORY_SALES_PSYCHOLOGY,instructions:['personalize from observed facts','sound like a real WhatsApp conversation','lead with relevance, not a generic sales pitch','offer a low-friction next step','do not invent urgency or proof']});
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
    });
  },
  async prepareProposalApproach(conversationId:string){
    await init();
    const c=await this.getConversation(conversationId);
    let commercialContext:any=null; try{commercialContext=c.context?JSON.parse(c.context):null;}catch{}
    const existing=await (prisma as any).$queryRawUnsafe('SELECT * FROM "SalesAction" WHERE conversationId=? AND type=\'SEND_MESSAGE\' AND title=\'Enviar proposta comercial\' AND status IN (\'PENDING_APPROVAL\',\'APPROVED\',\'SENT\') ORDER BY createdAt DESC LIMIT 1',conversationId);
    if(existing[0]) return {conversationId,reused:true,action:existing[0],requiresApproval:true,nextBestAction:'SEND_PROPOSAL'};
    const company=commercialContext?.prospect?.companyName||'sua empresa';
    const prompt=JSON.stringify({task:'PREPARE_PROPOSAL_COMMERCIAL_APPROACH',commercialContext,conversation:{stage:c.stage,temperature:c.temperature},salesPsychology:RB_FACTORY_SALES_PSYCHOLOGY,instructions:['summarize the value already established','reduce decision friction','make the next step clear','do not pressure or invent conditions']});
    const aiResult=await aiReply(prompt);
    const reply=aiResult?.reply||('Olá! '+company+', conforme nossa conversa, preparei a proposta comercial com base na demonstração que apresentamos. Posso te enviar os detalhes para avaliarmos juntos?');
    const confidence=Number(aiResult?.confidence||75);
    const actionId=id();
    await (prisma as any).$executeRawUnsafe('INSERT INTO "SalesConversationMessage" ("id","conversationId","role","content","intent","objection") VALUES (?,?,?,?,?,?)',id(),conversationId,'AGENT_DRAFT',reply,'PROPOSAL',null);
    await (prisma as any).$executeRawUnsafe('INSERT INTO "SalesAction" ("id","conversationId","type","title","payload") VALUES (?,?,?,?,?)',actionId,conversationId,'SEND_MESSAGE','Enviar proposta comercial',JSON.stringify({reply,confidence,requiresApproval:true}));
    await (prisma as any).$executeRawUnsafe('UPDATE "SalesConversation" SET "nextBestAction"=\'SEND_PROPOSAL\',"updatedAt"=CURRENT_TIMESTAMP WHERE id=?',conversationId);
    return {conversationId,reused:false,action:{id:actionId,title:'Enviar proposta comercial',payload:JSON.stringify({reply,confidence,requiresApproval:true}),status:'PENDING_APPROVAL'},reply,confidence,requiresApproval:true,nextBestAction:'SEND_PROPOSAL'};
  },
  async prepareDemoApproach(conversationId:string){
    await init();
    const c=await this.getConversation(conversationId);
    let commercialContext:any=null; try{commercialContext=c.context?JSON.parse(c.context):null;}catch{}
    const existing=await (prisma as any).$queryRawUnsafe('SELECT * FROM "SalesAction" WHERE conversationId=? AND type=\'SEND_MESSAGE\' AND title=\'Enviar demonstração comercial\' AND status IN (\'PENDING_APPROVAL\',\'APPROVED\',\'SENT\') ORDER BY createdAt DESC LIMIT 1',conversationId);
    if(existing[0]) return {conversationId,reused:true,action:existing[0],requiresApproval:true,nextBestAction:'SEND_DEMO'};
    const company=commercialContext?.prospect?.companyName||'sua empresa';
    const prompt=JSON.stringify({task:'PREPARE_DEMO_COMMERCIAL_APPROACH',commercialContext,conversation:{stage:c.stage,temperature:c.temperature},salesPsychology:RB_FACTORY_SALES_PSYCHOLOGY,instructions:['connect the demo to a real observed business need','make curiosity and relevance clear','ask for permission to send the demo','sound natural and concise']});
    const aiResult=await aiReply(prompt);
    const reply=aiResult?.reply||('Olá! '+company+', preparei uma demonstração do novo site com base no perfil da empresa. Posso te enviar o link para você avaliar?');
    const confidence=Number(aiResult?.confidence||75);
    const actionId=id();
    await (prisma as any).$executeRawUnsafe('INSERT INTO "SalesConversationMessage" ("id","conversationId","role","content","intent","objection") VALUES (?,?,?,?,?,?)',id(),conversationId,'AGENT_DRAFT',reply,'DEMO',null);
    await (prisma as any).$executeRawUnsafe('INSERT INTO "SalesAction" ("id","conversationId","type","title","payload") VALUES (?,?,?,?,?)',actionId,conversationId,'SEND_MESSAGE','Enviar demonstração comercial',JSON.stringify({reply,confidence,requiresApproval:true}));
    await (prisma as any).$executeRawUnsafe('UPDATE "SalesConversation" SET "nextBestAction"=\'SEND_DEMO\',"updatedAt"=CURRENT_TIMESTAMP WHERE id=?',conversationId);
    return {conversationId,reused:false,action:{id:actionId,title:'Enviar demonstração comercial',payload:JSON.stringify({reply,confidence,requiresApproval:true}),status:'PENDING_APPROVAL'},reply,confidence,requiresApproval:true,nextBestAction:'SEND_DEMO'};
  },

  async getConversationHistory(conversationId:string){
    await init();
    const conversation=await this.getConversation(conversationId);
    const actions=await (prisma as any).$queryRawUnsafe('SELECT * FROM "SalesAction" WHERE conversationId=? ORDER BY createdAt DESC',conversationId);
    return {...conversation,actions};
  },
  async prepareActionChannel(actionId:string){
    await init();
    const rows=await (prisma as any).$queryRawUnsafe('SELECT a.*,c.channel,c.context FROM "SalesAction" a JOIN "SalesConversation" c ON c.id=a.conversationId WHERE a.id=? LIMIT 1',actionId);
    const row=rows[0];
    if(!row) throw new Error('SALES_ACTION_NOT_FOUND');
    let context:any={}; try{context=row.context?JSON.parse(row.context):{};}catch{}
    const phone=String(context?.prospect?.phone||'').replace(/\D/g,'');
    const payload=row.payload?JSON.parse(row.payload):{};
    const message=String(payload.reply||'');
    const whatsappPhone=phone.length===11 ? '55'+phone : phone.startsWith('55') ? phone : phone;
    const whatsappUrl=whatsappPhone.length>=12 && message ? 'https://wa.me/'+whatsappPhone+'?text='+encodeURIComponent(message) : null;
    return {actionId:row.id,status:row.status,channel:row.channel,companyName:context?.prospect?.companyName||null,phone:context?.prospect?.phone||null,message,whatsappUrl,canOpenWhatsApp:Boolean(whatsappUrl),requiresApproval:Boolean(row.requiresApproval)};
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
  async closeConversationWork(conversationId:string,outcome:'WON'|'LOST'){
    await init();
    await (prisma as any).$executeRawUnsafe('UPDATE "SalesFollowUp" SET status=\'CANCELLED\' WHERE conversationId=? AND status=\'PENDING\'',conversationId);
    await (prisma as any).$executeRawUnsafe('UPDATE "SalesAction" SET status=\'CANCELLED\',decisionNote=? WHERE conversationId=? AND status IN (\'PENDING_APPROVAL\',\'APPROVED\')',outcome,conversationId);
    await (prisma as any).$executeRawUnsafe('UPDATE "SalesConversation" SET status=\'CLOSED\',nextBestAction=?,updatedAt=CURRENT_TIMESTAMP WHERE id=?',outcome==='WON'?'WON':'LOST',conversationId);
    return {conversationId,outcome,closed:true};
  },
  async scheduleRecommendedFollowUp(conversationId:string,result:any){
    await init();
    const c=await this.getConversation(conversationId);
    const reason=String(result?.nextBestAction||'FOLLOW_UP');
    if(['LOST','WON','REVIEW'].includes(reason)) return {reused:false,followUp:null,skipped:true,reason:'TERMINAL_OR_REVIEW'};
    const existing=await (prisma as any).$queryRawUnsafe('SELECT * FROM "SalesFollowUp" WHERE conversationId=? AND status=\'PENDING\' ORDER BY scheduledAt ASC LIMIT 1',conversationId);
    if(existing[0]) return {reused:true,followUp:existing[0]};
    const context=JSON.stringify({
      task:'PREPARE_HUMAN_FOLLOW_UP',
      conversation:{stage:c.stage,temperature:c.temperature,objection:c.objection,lastIntent:c.lastIntent},
      result,
      salesPsychology:RB_FACTORY_SALES_PSYCHOLOGY,
      instructions:[
        'continue the existing conversation instead of restarting the pitch',
        'sound like a real salesperson who remembers what was discussed',
        'use one relevant reason to contact the prospect',
        'one clear question or next step',
        'never guilt, pressure, fake urgency or pretend the prospect said something they did not say'
      ]
    });
    const aiResult=await aiReply(context);
    const draft=aiResult?.reply || (reason==='ASK_FOR_CLOSE'
      ? 'Oi! Conseguiu olhar a proposta com calma? Se fizer sentido, posso te ajudar a deixar os próximos passos bem simples.'
      : reason==='INVESTIGATE_OBJECTION'
        ? 'Oi! Fiquei pensando no ponto que você levantou. Se quiser, me diga o que ainda está te deixando em dúvida e eu vejo isso com você.'
        : 'Oi! Passando por aqui para retomar nossa conversa. Se ainda fizer sentido para vocês, posso te mostrar o próximo passo sem compromisso.');
    const scheduledAt=new Date(Date.now()+(reason==='ASK_FOR_CLOSE'?86400000:reason==='INVESTIGATE_OBJECTION'?2*86400000:3*86400000));
    const followUp=await this.scheduleFollowUp(conversationId,{scheduledAt,reason,draft});
    return {reused:false,followUp};
  },
  async prepareFollowUp(conversationId:string, reason:string){
    await init();
    const c=await this.getConversation(conversationId);
    let commercialContext:any=null; try{commercialContext=c.context?JSON.parse(c.context):null;}catch{}
    const recentMessages=c.messages.slice(-10).map((m:any)=>({role:m.role,content:m.content}));
    const prompt=JSON.stringify({
      task:'PREPARE_HUMAN_FOLLOW_UP',
      reason,
      conversation:{stage:c.stage,temperature:c.temperature,objection:c.objection,lastIntent:c.lastIntent},
      recentMessages,
      commercialContext,
      salesPsychology:RB_FACTORY_SALES_PSYCHOLOGY,
      instructions:[
        'continue the existing conversation instead of restarting the sales pitch',
        'sound like a real salesperson who remembers what was discussed',
        'use one relevant reason to contact the prospect',
        'use one clear question or next step',
        'keep it concise and natural for WhatsApp',
        'never guilt, pressure, fake urgency or pretend the prospect said something they did not say'
      ]
    });
    const aiResult=await aiReply(prompt);
    const fallback=reason==='ASK_FOR_CLOSE'
      ? 'Oi! Conseguiu olhar a proposta com calma? Se fizer sentido, posso te ajudar a deixar os próximos passos bem simples.'
      : reason==='INVESTIGATE_OBJECTION'
        ? 'Oi! Fiquei pensando no ponto que você levantou. Se quiser, me diga o que ainda está te deixando em dúvida e eu vejo isso com você.'
        : 'Oi! Passando por aqui para retomar nossa conversa. Se ainda fizer sentido para vocês, posso te mostrar o próximo passo sem compromisso.';
    return {draft:aiResult?.reply||fallback,confidence:Number(aiResult?.confidence||70),decisionBarrier:aiResult?.decisionBarrier||null};
  },
  async scheduleFollowUp(conversationId:string,input:any){
    return withSalesLock('follow-up:'+conversationId, async()=>{
    await init();
    const when=new Date(input.scheduledAt||Date.now()+86400000);
    const reason=String(input.reason||'FOLLOW_UP');
    const draft=String(input.draft||'');
    const existing=await (prisma as any).$queryRawUnsafe(
      'SELECT * FROM "SalesFollowUp" WHERE conversationId=? AND status=\'PENDING\' AND reason=? ORDER BY scheduledAt ASC LIMIT 1',
      conversationId,reason
    );
    if(existing[0]) return existing;
    const idv=id();
    await (prisma as any).$executeRawUnsafe('INSERT INTO "SalesFollowUp" ("id","conversationId","scheduledAt","reason","draft") VALUES (?,?,?,?,?)',idv,conversationId,when.toISOString(),reason,draft);
    const created=await (prisma as any).$queryRawUnsafe('SELECT * FROM "SalesFollowUp" WHERE id=?',idv);
    return created;
    });
  },
  async dashboard(){ await init(); const q=async(sql:string)=>Number((await (prisma as any).$queryRawUnsafe(sql))[0]?.count||0); const [conversations,hot,pending,followups,objections]=await Promise.all([q('SELECT COUNT(*) count FROM "SalesConversation" WHERE status=\'OPEN\''),q('SELECT COUNT(*) count FROM "SalesConversation" WHERE temperature IN (\'HOT\',\'VERY_HOT\')'),q('SELECT COUNT(*) count FROM "SalesAction" WHERE status=\'PENDING_APPROVAL\''),q('SELECT COUNT(*) count FROM "SalesFollowUp" WHERE status=\'PENDING\''),q('SELECT COUNT(*) count FROM "SalesObjection" WHERE resolved=0')]); return {conversations,hotLeads:hot,pendingActions:pending,pendingFollowUps:followups,openObjections:objections,mode:'SENIOR_SALES_SUPERVISED'}; }
};
