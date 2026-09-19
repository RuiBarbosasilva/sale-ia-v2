import { prisma } from '../modules/mercadoLivre/lib/prisma';

const PLATFORMS = [
  { name:'Hotmart', slug:'hotmart', type:'AFFILIATE_NETWORK', baseUrl:'https://hotmart.com', apiBaseUrl:'https://developers.hotmart.com', capability:'API_CREDENTIALS' },
  { name:'Eduzz', slug:'eduzz', type:'AFFILIATE_NETWORK', baseUrl:'https://www.eduzz.com', apiBaseUrl:null, capability:'MANUAL_OR_OFFICIAL_API' },
  { name:'Kiwify', slug:'kiwify', type:'AFFILIATE_NETWORK', baseUrl:'https://kiwify.com.br', apiBaseUrl:null, capability:'MANUAL_OR_OFFICIAL_API' },
  { name:'Braip', slug:'braip', type:'AFFILIATE_NETWORK', baseUrl:'https://braip.com', apiBaseUrl:null, capability:'POSTBACK_MANUAL_AFFILIATION' },
  { name:'Monetizze', slug:'monetizze', type:'AFFILIATE_NETWORK', baseUrl:'https://monetizze.com.br', apiBaseUrl:null, capability:'MANUAL_OR_OFFICIAL_API' },
  { name:'Amazon Afiliados', slug:'amazon-afiliados', type:'AFFILIATE_NETWORK', baseUrl:'https://associados.amazon.com.br', apiBaseUrl:null, capability:'OFFICIAL_PROGRAM' },
  { name:'Shopee Afiliados', slug:'shopee-afiliados', type:'AFFILIATE_NETWORK', baseUrl:'https://affiliate.shopee.com.br', apiBaseUrl:null, capability:'OFFICIAL_PROGRAM' },
  { name:'Mercado Livre Afiliados', slug:'mercado-livre-afiliados', type:'AFFILIATE_NETWORK', baseUrl:'https://www.mercadolivre.com.br', apiBaseUrl:null, capability:'OFFICIAL_PROGRAM' },
  { name:'ClickBank', slug:'clickbank', type:'AFFILIATE_NETWORK', baseUrl:'https://www.clickbank.com', apiBaseUrl:null, capability:'MANUAL_OR_OFFICIAL_API' },
  { name:'Impact', slug:'impact', type:'AFFILIATE_NETWORK', baseUrl:'https://impact.com', apiBaseUrl:null, capability:'OFFICIAL_API' },
  { name:'PartnerStack', slug:'partnerstack', type:'AFFILIATE_NETWORK', baseUrl:'https://partnerstack.com', apiBaseUrl:null, capability:'OFFICIAL_API' },
  { name:'Mercado Livre Seller', slug:'mercado-livre-seller', type:'MARKETPLACE', baseUrl:'https://www.mercadolivre.com.br', apiBaseUrl:'https://api.mercadolibre.com', capability:'OFFICIAL_API' },
  { name:'Shopee Seller', slug:'shopee-seller', type:'MARKETPLACE', baseUrl:'https://shopee.com.br', apiBaseUrl:null, capability:'OFFICIAL_API_OR_MANUAL' },
  { name:'Instagram Shop', slug:'instagram-shop', type:'SOCIAL_COMMERCE', baseUrl:'https://www.instagram.com', apiBaseUrl:null, capability:'META_COMMERCE' }
];

export const salesPlatformService = {
  async bootstrap() {
    const result = [];
    for (const p of PLATFORMS) {
      const metadata = JSON.stringify({ capability:p.capability, managedBy:'SALE-IA-V2', automationMode:'SUPERVISED' });
      result.push(await (prisma as any).affiliateNetwork.upsert({
        where:{slug:p.slug},
        update:{name:p.name,type:p.type,baseUrl:p.baseUrl,apiBaseUrl:p.apiBaseUrl,metadata},
        create:{name:p.name,slug:p.slug,type:p.type,baseUrl:p.baseUrl,apiBaseUrl:p.apiBaseUrl,status:'CONFIGURED',metadata}
      }));
    }
    return result;
  },
  async list() {
    return (prisma as any).affiliateNetwork.findMany({orderBy:{name:'asc'}});
  }
};
