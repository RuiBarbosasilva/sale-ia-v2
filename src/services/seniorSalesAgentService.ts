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
  await (prisma as any).$executeRawUnsafe('ALTER TABLE "SalesAction" ADD COLUMN "approvedAt" DATETIME').catch(()=>{});
  await (prisma as any).$executeRawUnsafe('ALTER TABLE "SalesAction" ADD COLUMN "sentAt" DATETIME').catch(()=>{});
  await (prisma as any).$executeRawUnsafe('ALTER TABLE "SalesAction" ADD COLUMN "decisionNote" TEXT').catch(()=>{});
  initialized = true;
}
function id(){ return crypto.randomUUID(); }
function clamp(n:number){ return Math.max(0,Math.min(100,n)); }
function textInput(value: unknown, max = 2000){ return typeof value === 'string' ? value.trim().slice(0, max) : ''; }
function safeJson(value: unknown, max = 8000): string | null { try { const raw = JSON.stringify(value); return typeof raw === 'string' ? raw.slice(0, max) : null; } catch { return null; } }
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
      system_instruction: `Você é o Vendedor Sênior e estrategista comercial do SALE-IA-V2, especialista em vendas consultivas, abordagem, persuasão ética, copywriting e conversão de negócios locais brasileiros.
APLIQUE, conforme o contexto, princípios de SPIN Selling, perguntas de descoberta, qualificação, AIDA, PAS, value selling, prova social somente quando houver evidência, tratamento estruturado de objeções e fechamento por próximo passo.
OBJETIVO: aumentar conversão sem manipulação. Primeiro entenda contexto, dor, impacto, urgência, autoridade e critério de decisão; depois conecte solução -> benefício -> evidência -> próximo passo.
ABORDAGEM: personalizada para empresa, segmento e cidade; curta no primeiro contato; gancho baseado em oportunidade real observada; CTA simples; nunca despeje uma apresentação inteira na primeira mensagem.
OBJEÇÕES: acolher -> diagnosticar -> responder com evidência disponível -> reduzir risco -> pedir um próximo passo pequeno. Preço não deve ser defendido automaticamente; mostre valor e escopo antes de negociar.
FOLLOW-UP: cada contato deve ter motivo novo e útil; varie ângulo e não repita mensagens; respeite sinais de desinteresse e pare quando solicitado.
COPY: escreva headlines, CTAs, mensagens WhatsApp, propostas e anúncios com clareza, benefício concreto, especificidade e linguagem natural. Evite clichês, promessas absolutas e urgência falsa.
CRIATIVOS: pense em conceito, gancho, ângulo, público, promessa verificável, prova disponível, CTA e formato; proponha variações A/B quando solicitado.
NUNCA invente preço, prazo, garantia, estoque, resultado, depoimento, cliente, número, autoridade ou prova. Não use pressão enganosa, medo, culpa ou falsa escassez.
Quando houver sinal de compra, conduza objetivamente ao fechamento. Quando faltar informação crítica, faça uma pergunta comercial curta.
Responda em português brasileiro. Retorne JSON puro com: reply, intent, objection, nextBestAction, confidence, escalationRequired, salesStrategy, creativeAngle, suggestedVariants.`
    });
    const text=String(interaction?.output_text||'').trim();
    if(!text) return null;
    const cleaned=text.replace(/^\\`\\`\\`json/i,'').replace(/\\`\\`\\`$/,'').trim();
    try{return JSON.parse(cleaned)}catch{return {reply:text,intent:'UNKNOWN',objection:null,nextBestAction:'REVIEW',confidence:50,escalationRequired:false};}
  } catch { return null; }
}

export const seniorSalesAgentService = {
  async createConversation(input:any){
    await init();
    const source = input && typeof input === 'object' ? input : {};
    const conversationId=id();
    let context: string | null = null;
    if (source.context !== undefined) {
      try {
        const raw = JSON.stringify(source.context);
        context = raw.length <= 10000 ? raw : raw.slice(0, 10000);
      } catch {
        context = null;
      }
    }
    await (prisma as any).$executeRawUnsafe(
      'INSERT INTO "SalesConversation" ("id","leadId","channel","context") VALUES (?,?,?,?)',
      conversationId,
      textInput(source.leadId,120)||null,
      textInput(source.channel,40)||'WEB',
      context
    );
    return this.getConversation(conversationId);
  },
  async getConversation(idv:string){ const conversationId=textInput(idv,100); if(!conversationId) throw new Error('INVALID_CONVERSATION_ID'); await init(); const c=await (prisma as any).$queryRawUnsafe('SELECT * FROM "SalesConversation" WHERE id=?',conversationId); if(!c[0]) throw new Error('SALES_CONVERSATION_NOT_FOUND'); const messages=await (prisma as any).$queryRawUnsafe('SELECT * FROM "SalesConversationMessage" WHERE conversationId=? ORDER BY createdAt ASC',conversationId); const objections=await (prisma as any).$queryRawUnsafe('SELECT * FROM "SalesObjection" WHERE conversationId=? ORDER BY createdAt DESC',conversationId); const followUps=await (prisma as any).$queryRawUnsafe('SELECT * FROM "SalesFollowUp" WHERE conversationId=? ORDER BY scheduledAt ASC',conversationId); return {...c[0],messages,objections,followUps}; },
  async respond(conversationId:string, input:any){
    await init(); const c=await this.getConversation(conversationId); const customer=textInput(input?.message,4000); if(!customer) throw new Error('MESSAGE_REQUIRED');
    const localIntent=intent(customer), obj=classify(customer), temp=temperature(localIntent), st=stage(customer,localIntent);
    await (prisma as any).$executeRawUnsafe('INSERT INTO "SalesConversationMessage" ("id","conversationId","role","content","intent","objection") VALUES (?,?,?,?,?,?)',id(),conversationId,'CUSTOMER',customer,String(localIntent),obj);
    if(obj) await (prisma as any).$executeRawUnsafe('INSERT INTO "SalesObjection" ("id","conversationId","type","rawText") VALUES (?,?,?,?)',id(),conversationId,obj,customer);
    let commercialContext:any=null; try{commercialContext=c.context?JSON.parse(c.context):null;}catch{commercialContext=null;}
    const context=JSON.stringify({conversation:c,messages:c.messages.slice(-12),commercialContext,customerMessage:customer,detectedIntent:localIntent,detectedObjection:obj});
    const ai=await aiReply(context);
    const reply=ai?.reply || this.fallback(customer,obj,localIntent);
    const next=ai?.nextBestAction || (localIntent>=60?'ASK_FOR_CLOSE':obj?'INVESTIGATE_OBJECTION':'DISCOVER_NEED');
    const confidence=clamp(Number(ai?.confidence||65));
    await (prisma as any).$executeRawUnsafe('INSERT INTO "SalesConversationMessage" ("id","conversationId","role","content","intent","objection") VALUES (?,?,?,?,?,?)',id(),conversationId,'AGENT_DRAFT',reply,String(ai?.intent||localIntent),obj);
    await (prisma as any).$executeRawUnsafe('UPDATE "SalesConversation" SET "stage"=?,"temperature"=?,"intentScore"=?,"objection"=?,"lastIntent"=?,"nextBestAction"=?,"updatedAt"=CURRENT_TIMESTAMP WHERE id=?',st,temp,localIntent,obj,ai?.intent||String(localIntent),next,conversationId);
    await (prisma as any).$executeRawUnsafe('INSERT INTO "SalesAction" ("id","conversationId","type","title","payload") VALUES (?,?,?,?,?)',id(),conversationId,'SEND_MESSAGE','Enviar resposta comercial',safeJson({reply,confidence,escalationRequired:Boolean(ai?.escalationRequired)},6000) || JSON.stringify({reply,confidence}));
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
  async prepareProposalApproach(conversationId:string){
    await init();
    const c=await this.getConversation(conversationId);
    let commercialContext:any=null; try{commercialContext=c.context?JSON.parse(c.context):null;}catch{}
    const existing=await (prisma as any).$queryRawUnsafe('SELECT * FROM "SalesAction" WHERE conversationId=? AND type=\'SEND_MESSAGE\' AND title=\'Enviar proposta comercial\' AND status IN (\'PENDING_APPROVAL\',\'APPROVED\',\'SENT\') ORDER BY createdAt DESC LIMIT 1',conversationId);
    if(existing[0]) return {conversationId,reused:true,action:existing[0],requiresApproval:true,nextBestAction:'SEND_PROPOSAL'};
    const company=commercialContext?.prospect?.companyName||'sua empresa';
    const prompt=JSON.stringify({task:'PREPARE_PROPOSAL_COMMERCIAL_APPROACH',commercialContext,conversation:{stage:c.stage,temperature:c.temperature}});
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
    const prompt=JSON.stringify({task:'PREPARE_DEMO_COMMERCIAL_APPROACH',commercialContext,conversation:{stage:c.stage,temperature:c.temperature}});
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
    const phone=String(context?.prospect?.phone||'').replace(/\\D/g,'');
    let payload:any={}; try{payload=row.payload?JSON.parse(row.payload):{};}catch{}
    const message=textInput(payload?.reply,4000);
    const whatsappPhone=phone.length===11 ? '55'+phone : phone.startsWith('55') ? phone : phone;
    const whatsappUrl=whatsappPhone.length>=12 && message ? 'https://wa.me/'+whatsappPhone+'?text='+encodeURIComponent(message) : null;
    return {actionId:row.id,status:row.status,channel:row.channel,companyName:context?.prospect?.companyName||null,phone:context?.prospect?.phone||null,message,whatsappUrl,canOpenWhatsApp:Boolean(whatsappUrl),requiresApproval:Boolean(row.requiresApproval)};
  },
  async approveAction(actionId:string){
    await init();
    const key=textInput(actionId,100); if(!key) throw new Error('INVALID_ACTION_ID');
    const rows=await (prisma as any).$queryRawUnsafe('SELECT * FROM "SalesAction" WHERE id=? LIMIT 1',key);
    const action=rows[0];
    if(!action) throw new Error('SALES_ACTION_NOT_FOUND');
    if(action.status!=='PENDING_APPROVAL') throw new Error('SALES_ACTION_NOT_PENDING');
    await (prisma as any).$executeRawUnsafe('UPDATE "SalesAction" SET status=\'APPROVED\' WHERE id=?',key);
    return (await (prisma as any).$queryRawUnsafe('SELECT * FROM "SalesAction" WHERE id=?',actionId))[0];
  },
  async markActionSent(actionId:string,metadata?:any){
    await init();
    const rows=await (prisma as any).$queryRawUnsafe('SELECT * FROM "SalesAction" WHERE id=? LIMIT 1',actionId);
    if(!rows[0]) throw new Error('SALES_ACTION_NOT_FOUND');
    if(rows[0].status!=='APPROVED') throw new Error('SALES_ACTION_NOT_APPROVED');
    await (prisma as any).$executeRawUnsafe('UPDATE "SalesAction" SET status=\'SENT\',sentAt=CURRENT_TIMESTAMP,decisionNote=? WHERE id=?',safeJson(metadata,4000),actionId);
    return (await (prisma as any).$queryRawUnsafe('SELECT * FROM "SalesAction" WHERE id=?',actionId))[0];
  },
  async rejectAction(actionId:string,reason?:string){
    await init();
    const rows=await (prisma as any).$queryRawUnsafe('SELECT * FROM "SalesAction" WHERE id=? LIMIT 1',actionId);
    if(!rows[0]) throw new Error('SALES_ACTION_NOT_FOUND');
    if(rows[0].status!=='PENDING_APPROVAL') throw new Error('SALES_ACTION_NOT_PENDING');
    let originalPayload: unknown = null;
    try { originalPayload = rows[0].payload ? JSON.parse(rows[0].payload) : null; } catch { originalPayload = null; }
    const payload=JSON.stringify({rejectionReason:textInput(reason,500)||'REJECTED_BY_OPERATOR',originalPayload});
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
    const reason=String(result?.nextBestAction||'FOLLOW_UP');
    if(['LOST','WON','REVIEW'].includes(reason)) return {reused:false,followUp:null,skipped:true,reason:'TERMINAL_OR_REVIEW'};
    const existing=await (prisma as any).$queryRawUnsafe('SELECT * FROM "SalesFollowUp" WHERE conversationId=? AND status=\'PENDING\' ORDER BY scheduledAt ASC LIMIT 1',conversationId);
    if(existing[0]) return {reused:true,followUp:existing[0]};
    const draft=reason==='ASK_FOR_CLOSE'
      ? 'Olá! Passando para saber se conseguiu avaliar nossa proposta. Se fizer sentido para vocês, posso avançar com os próximos passos.'
      : reason==='INVESTIGATE_OBJECTION'
        ? 'Olá! Fiquei à disposição caso tenha ficado alguma dúvida sobre a proposta ou sobre como podemos melhorar a presença digital da empresa. Posso esclarecer algum ponto?'
        : 'Olá! Passando para acompanhar nossa conversa sobre o site da empresa. Se quiser, posso retomar a demonstração e explicar os próximos passos.';
    const scheduledAt=new Date(Date.now()+(reason==='ASK_FOR_CLOSE'?86400000:reason==='INVESTIGATE_OBJECTION'?2*86400000:3*86400000));
    const followUp=await this.scheduleFollowUp(conversationId,{scheduledAt,reason,draft});
    return {reused:false,followUp};
  },
  async scheduleFollowUp(conversationId:string,input:any){
    await init();
    await this.getConversation(conversationId);
    const source=input && typeof input === 'object' ? input : {};
    const parsed = source.scheduledAt ? new Date(String(source.scheduledAt)) : new Date(Date.now()+86400000);
    const when = Number.isNaN(parsed.getTime()) ? new Date(Date.now()+86400000) : parsed;
    const maxSchedule = new Date(Date.now() + 365*86400000);
    const scheduledAt = when < new Date() ? new Date(Date.now()+60000) : (when > maxSchedule ? maxSchedule : when);
    const reason=textInput(source.reason,120)||'FOLLOW_UP';
    const draft=textInput(source.draft,2000);
    const idv=id();
    await (prisma as any).$executeRawUnsafe('INSERT INTO "SalesFollowUp" ("id","conversationId","scheduledAt","reason","draft") VALUES (?,?,?,?,?)',idv,conversationId,scheduledAt.toISOString(),reason,draft);
    return (prisma as any).$queryRawUnsafe('SELECT * FROM "SalesFollowUp" WHERE id=?',idv);
  },
  async dashboard(){ await init(); const q=async(sql:string)=>Number((await (prisma as any).$queryRawUnsafe(sql))[0]?.count||0); const [conversations,hot,pending,followups,objections]=await Promise.all([q('SELECT COUNT(*) count FROM "SalesConversation" WHERE status=\'OPEN\''),q('SELECT COUNT(*) count FROM "SalesConversation" WHERE temperature IN (\'HOT\',\'VERY_HOT\')'),q('SELECT COUNT(*) count FROM "SalesAction" WHERE status=\'PENDING_APPROVAL\''),q('SELECT COUNT(*) count FROM "SalesFollowUp" WHERE status=\'PENDING\''),q('SELECT COUNT(*) count FROM "SalesObjection" WHERE resolved=0')]); return {conversations,hotLeads:hot,pendingActions:pending,pendingFollowUps:followups,openObjections:objections,mode:'SENIOR_SALES_SUPERVISED'}; }
};
