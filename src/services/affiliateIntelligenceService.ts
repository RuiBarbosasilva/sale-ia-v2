import crypto from 'crypto';
import { prisma } from '../modules/mercadoLivre/lib/prisma';

const DEFAULT_NETWORKS = [
  ['Hotmart','hotmart','https://hotmart.com','https://developers.hotmart.com'],
  ['Eduzz','eduzz','https://www.eduzz.com',''],
  ['Kiwify','kiwify','https://kiwify.com.br',''],
  ['Braip','braip','https://braip.com',''],
  ['Monetizze','monetizze','https://monetizze.com.br',''],
  ['Amazon Afiliados','amazon-afiliados','https://associados.amazon.com.br',''],
  ['Shopee Afiliados','shopee-afiliados','https://affiliate.shopee.com.br',''],
  ['Mercado Livre Afiliados','mercado-livre-afiliados','https://www.mercadolivre.com.br','']
];

function num(v: unknown, fallback=0){ const n=Number(v); return Number.isFinite(n)?n:fallback; }
function clamp(v: number){ return Math.max(0,Math.min(100,v)); }
function slug(s: string){ return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,50); }

function scoreProduct(p: Record<string, unknown>){
  const commission=clamp(num(p.commissionRate,0));
  const demand=clamp(num(p.demandScore,p.popularityScore ?? 50));
  const competition=clamp(num(p.competitionScore,50));
  const content=clamp(num(p.contentScore,70));
  const trend=clamp(num(p.popularityScore,50));
  const conversion=clamp(num(p.conversionScore,50));
  const saturation=clamp(num(p.saturationScore,30));
  const score=clamp(commission*.22+demand*.22+content*.16+trend*.14+conversion*.16+(100-competition)*.06+(100-saturation)*.04);
  return {score:Math.round(score*100)/100,demand,competition,content,trend,conversion,saturation,commission};
}

export const affiliateIntelligenceService = {
  async bootstrapNetworks(){
    const results=[];
    for(const [name,s,baseUrl,apiBaseUrl] of DEFAULT_NETWORKS){
      results.push(await prisma.affiliateNetwork.upsert({where:{slug:s},update:{baseUrl,apiBaseUrl:apiBaseUrl||null},create:{name,slug:s,baseUrl,apiBaseUrl:apiBaseUrl||null,status:'CONFIGURED'}}));
    }
    return results;
  },
  async listNetworks(){ return prisma.affiliateNetwork.findMany({orderBy:{name:'asc'},include:{_count:{select:{products:true,actions:true}}}}); },
  async createNetwork(input: Record<string, unknown>){
    const name=String(input.name||'').trim(); if(!name) throw new Error('NETWORK_NAME_REQUIRED');
    return prisma.affiliateNetwork.create({data:{name,slug:slug(String(input.slug||name)),type:String(input.type||'AFFILIATE_NETWORK'),baseUrl:input.baseUrl||null,apiBaseUrl:input.apiBaseUrl||null,status:String(input.status||'CONFIGURED'),metadata:input.metadata?JSON.stringify(input.metadata):null}});
  },
  async updateNetwork(id: string, input: Record<string, unknown>){
    const current=await prisma.affiliateNetwork.findUnique({where:{id}}); if(!current) throw new Error('NETWORK_NOT_FOUND');
    return prisma.affiliateNetwork.update({where:{id},data:{...(input.name!==undefined?{name:String(input.name).trim()}:{}),...(input.baseUrl!==undefined?{baseUrl:input.baseUrl||null}:{}),...(input.apiBaseUrl!==undefined?{apiBaseUrl:input.apiBaseUrl||null}:{}),...(input.active!==undefined?{active:Boolean(input.active)}:{}),...(input.status!==undefined?{status:String(input.status)}:{}),...(input.credentialStatus!==undefined?{credentialStatus:String(input.credentialStatus)}:{})}});
  },
  async ingestProducts(networkId: string, products: Array<Record<string, unknown>>){
    const network=await prisma.affiliateNetwork.findUnique({where:{id:networkId}}); if(!network) throw new Error('NETWORK_NOT_FOUND');
    let created=0,updated=0;
    for(const raw of products||[]){
      const name=String(raw.name||'').trim(); if(!name) continue;
      const ext=raw.externalId==null?null:String(raw.externalId);
      const data:any={name,url:raw.url||null,affiliateUrl:raw.affiliateUrl||null,category:raw.category||null,subcategory:raw.subcategory||null,price:raw.price==null?null:num(raw.price),commissionRate:raw.commissionRate==null?null:num(raw.commissionRate),commissionAmount:raw.commissionAmount==null?null:num(raw.commissionAmount),recurring:Boolean(raw.recurring),gravity:raw.gravity==null?null:num(raw.gravity),popularityScore:raw.popularityScore==null?null:num(raw.popularityScore),demandScore:raw.demandScore==null?null:num(raw.demandScore),competitionScore:raw.competitionScore==null?null:num(raw.competitionScore),contentScore:raw.contentScore==null?null:num(raw.contentScore),conversionScore:raw.conversionScore==null?null:num(raw.conversionScore),saturationScore:raw.saturationScore==null?null:num(raw.saturationScore),description:raw.description||null,salesPageUrl:raw.salesPageUrl||null,metadata:raw.metadata?JSON.stringify(raw.metadata):null,lastScannedAt:new Date()};
      let p:any;
      if(ext){ p=await prisma.affiliateProduct.upsert({where:{networkId_externalId:{networkId,externalId:ext}},update:data,create:{networkId,externalId:ext,...data}}); updated++; }
      else { p=await prisma.affiliateProduct.create({data:{networkId,...data}}); created++; }
      const s=scoreProduct(p);
      await prisma.affiliateProduct.update({where:{id:p.id},data:{demandScore:s.demand,competitionScore:s.competition,contentScore:s.content,conversionScore:s.conversion,popularityScore:s.trend,saturationScore:s.saturation,opportunityScore:s.score,status:s.score>=75?'SHORTLISTED':s.score>=55?'ANALYZED':'LOW_PRIORITY'}});
      await prisma.affiliateProductScore.create({data:{productId:p.id,score:s.score,demand:s.demand,competition:s.competition,commission:s.commission,contentFit:s.content,trend:s.trend,reasoning:'Score calculado por comissão, demanda, tendência, conteúdo, conversão, concorrência e saturação.'}});
      if(s.score>=55){
        const existingOpportunity=await prisma.affiliateOpportunity.findFirst({where:{productId:p.id,status:{in:['NEW','READY','PENDING_APPROVAL']}}});
        const opportunityData={score:s.score,recommendation:s.score>=75?'PRIORIZAR TESTE':'TESTAR COM CAUTELA',strategy:s.score>=75?'Conteúdo + landing page + tracking':'Conteúdo orgânico + validação',requiresAction:p.affiliationStatus!=='AFFILIATED',actionType:p.affiliationStatus==='AFFILIATED'?'CREATE_CAMPAIGN':'AFFILIATE_PRODUCT'};
        if(existingOpportunity) await prisma.affiliateOpportunity.update({where:{id:existingOpportunity.id},data:opportunityData});
        else await prisma.affiliateOpportunity.create({data:{productId:p.id,status:'NEW',...opportunityData}});
      }
    }
    await prisma.affiliateNetwork.update({where:{id:networkId},data:{lastScanAt:new Date()}});
    return {created,updated,total:created+updated};
  },
  async importAffiliateOffer(networkId: string, input: Record<string, unknown>){
    const network=await prisma.affiliateNetwork.findUnique({where:{id:networkId}});
    if(!network) throw new Error('NETWORK_NOT_FOUND');
    const name=String(input.name||'').trim();
    const affiliateUrl=String(input.affiliateUrl||'').trim();
    if(!name) throw new Error('AFFILIATE_PRODUCT_NAME_REQUIRED');
    if(!affiliateUrl) throw new Error('AFFILIATE_URL_REQUIRED');

    const externalId=input.externalId==null?'manual-'+crypto.createHash('sha256').update(affiliateUrl).digest('hex').slice(0,16):String(input.externalId);
    const data:any={
      name,
      affiliateUrl,
      url:input.url||affiliateUrl,
      salesPageUrl:input.salesPageUrl||input.url||affiliateUrl,
      category:input.category||null,
      description:input.description||null,
      price:input.price==null?null:num(input.price),
      commissionRate:input.commissionRate==null?null:num(input.commissionRate),
      commissionAmount:input.commissionAmount==null?null:num(input.commissionAmount),
      recurring:Boolean(input.recurring),
      affiliationStatus:'AFFILIATED',
      affiliationMode:'MANUAL',
      metadata:input.metadata?JSON.stringify(input.metadata):null,
      lastScannedAt:new Date()
    };

    let product=await prisma.affiliateProduct.upsert({
      where:{networkId_externalId:{networkId,externalId}},
      update:data,
      create:{networkId,externalId,...data}
    });

    const s=scoreProduct(product);
    product=await prisma.affiliateProduct.update({
      where:{id:product.id},
      data:{
        demandScore:s.demand,
        competitionScore:s.competition,
        contentScore:s.content,
        conversionScore:s.conversion,
        popularityScore:s.trend,
        saturationScore:s.saturation,
        opportunityScore:s.score,
        status:s.score>=55?'SHORTLISTED':'ANALYZED'
      }
    });

    const existingOpportunity=await prisma.affiliateOpportunity.findFirst({where:{productId:product.id,status:{in:['NEW','READY','PENDING_APPROVAL']}},orderBy:{createdAt:'desc'}});
    if(existingOpportunity){
      await prisma.affiliateOpportunity.update({where:{id:existingOpportunity.id},data:{
      score:s.score,recommendation:'Produto afiliado manualmente; pronto para campanha supervisionada.',strategy:'Conteúdo + landing page + tracking',requiresAction:false,actionType:'CREATE_CAMPAIGN'}});
    } else {
      await prisma.affiliateOpportunity.create({data:{productId:product.id,score:s.score,status:'NEW',recommendation:'Produto afiliado manualmente; pronto para campanha supervisionada.',strategy:'Conteúdo + landing page + tracking',requiresAction:false,actionType:'CREATE_CAMPAIGN'}});
    }

    return product;
  },
  async topProducts(take=50){ return prisma.affiliateProduct.findMany({take:Math.min(Math.max(take,1),200),orderBy:{opportunityScore:'desc'},include:{network:{select:{name:true,slug:true}},_count:{select:{campaigns:true,scores:true}}}}); },
  async opportunities(status?:string){ return prisma.affiliateOpportunity.findMany({where:status?{status}:undefined,orderBy:[{score:'desc'},{createdAt:'desc'}],take:200,include:{product:{include:{network:{select:{name:true,slug:true}}}}}}); },
  async campaigns(status?:string){ return prisma.affiliateCampaign.findMany({where:status?{status}:undefined,orderBy:{createdAt:'desc'},take:100,include:{product:{select:{id:true,name:true,opportunityScore:true}},contents:{orderBy:{createdAt:'desc'}},actions:{orderBy:{createdAt:'desc'}}}}); },
  async createCampaign(input: Record<string, unknown>){
    const product=await prisma.affiliateProduct.findUnique({where:{id:input.productId}}); if(!product) throw new Error('PRODUCT_NOT_FOUND');
    const name=String(input.name || (product.name + ' - campanha de vendas')).trim();
    if(!name) throw new Error('CAMPAIGN_NAME_REQUIRED');
    const landingPageUrl=input.landingPageUrl||product.affiliateUrl||product.salesPageUrl||product.url||null;
    const existing=await prisma.affiliateCampaign.findFirst({where:{productId:product.id,name,status:{in:['DRAFT','ACTIVE']}}});
    if(existing){
      const action=await prisma.affiliateAction.findFirst({where:{campaignId:existing.id,type:'CAMPAIGN_CREATED'}});
      if(!action) await prisma.affiliateAction.create({data:{campaignId:existing.id,type:'CAMPAIGN_CREATED',status:'READY',title:'Campanha criada: '+name,description:'Pronta para revisão e execução supervisionada.',requiresApproval:true}});
      return existing;
    }
    const campaign=await prisma.affiliateCampaign.create({data:{productId:product.id,name,objective:String(input.objective||'SALES'),strategy:input.strategy||'Teste controlado de conteúdo e conversão',targetAudience:input.targetAudience||null,status:'DRAFT',landingPageUrl,trackingCode:'aff-'+crypto.randomBytes(5).toString('hex')}});
    await prisma.affiliateAction.create({data:{campaignId:campaign.id,type:'CAMPAIGN_CREATED',status:'READY',title:'Campanha criada: '+name,description:'Pronta para revisão e execução supervisionada.',requiresApproval:true}});
    return campaign;
  },
  async generateContent(campaignId:string,platforms:string[]=['INSTAGRAM','TIKTOK','YOUTUBE_SHORTS']){
    const campaign=await prisma.affiliateCampaign.findUnique({where:{id:campaignId},include:{product:true}}); if(!campaign) throw new Error('CAMPAIGN_NOT_FOUND');
    const p=campaign.product, created=[], requested=[...new Set(platforms)];
    const existing=await prisma.affiliateContent.findMany({where:{campaignId,platform:{in:requested}}});
    const byPlatform=new Map(existing.map(item=>[item.platform,item]));
    for(const platform of requested){
      const current=byPlatform.get(platform);
      if(current){ created.push(current); continue; }
      const type=platform==='YOUTUBE_SHORTS'?'SHORT_VIDEO':'POST';
      created.push(await prisma.affiliateContent.create({data:{campaignId,platform,type,angle:'PROBLEMA -> SOLUÇÃO',hook:'Você está tentando resolver '+(p.category||'esse problema')+' e ainda não encontrou uma solução prática?',title:'Uma alternativa para '+(p.category||p.name),body:'Conheça '+p.name+'. Analise a oferta, veja se faz sentido para você e confira os detalhes antes de decidir.',cta:'Saiba mais pelo link da campanha.',hashtags:'#'+slug(p.category||'oferta')+' #dicas #solucao',mediaPrompt:'Criativo comercial vertical, limpo, informativo, sem promessas enganosas, para '+p.name+'.',status:'DRAFT'}}));
    }
    return created;
  },
  async createAutonomyPlan(){
    const products=await this.topProducts(20);
    const items=[];
    for(const p of products){
      const type=p.affiliationStatus==='AFFILIATED'?'CREATE_CAMPAIGN':'REQUEST_AFFILIATION';
      const title=type==='CREATE_CAMPAIGN'?'Criar campanha para '+p.name:'Solicitar afiliação: '+p.name;
      const existing=await prisma.affiliateAction.findFirst({where:{type,title,status:{in:['PENDING_APPROVAL','READY','APPROVED']}}});
      let action=existing;
      if(!action){
        action=await prisma.affiliateAction.create({data:{networkId:p.networkId,type,title,status:'PENDING_APPROVAL',description:type==='CREATE_CAMPAIGN'?'Produto já afiliado; preparar campanha.':'Produto selecionado; requer afiliação na plataforma.',payload:JSON.stringify({productId:p.id,score:p.opportunityScore}),requiresApproval:true}});
      }
      items.push({productId:p.id,product:p.name,network:p.network.name,score:p.opportunityScore,action:type,status:action.status,actionId:action.id});
    }
    return {generatedAt:new Date().toISOString(),mode:'SUPERVISED',items};
  },
  async dashboard(){
    const [networks,products,opportunities,campaigns,content,actions]=await Promise.all([prisma.affiliateNetwork.count({where:{active:true}}),prisma.affiliateProduct.count(),prisma.affiliateOpportunity.count({where:{status:'NEW'}}),prisma.affiliateCampaign.count({where:{status:{in:['DRAFT','ACTIVE']}}}),prisma.affiliateContent.count({where:{status:'DRAFT'}}),prisma.affiliateAction.count({where:{status:{in:['PENDING_APPROVAL','READY']}}})]);
    return {networks,products,opportunities,campaigns,contentDrafts:content,actionsPending:actions,totalNetworks:networks,totalProducts:products,totalOpportunities:opportunities,totalCampaigns:campaigns,totalContentDrafts:content,totalActionsPending:actions,mode:'SUPERVISED_AUTONOMY'};
  }
};
