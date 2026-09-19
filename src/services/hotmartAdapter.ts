import { affiliateNetworkSecurityService } from './affiliateNetworkSecurityService';

export type HotmartCredentials = {
  clientId?: string;
  clientSecret?: string;
  accessToken?: string;
};

const API_BASE = 'https://developers.hotmart.com';
const OAUTH_URL = 'https://api-sec-vlc.hotmart.com/security/oauth/token';

function cleanCredentials(value:any): HotmartCredentials {
  return {
    clientId: value?.clientId || value?.client_id,
    clientSecret: value?.clientSecret || value?.client_secret,
    accessToken: value?.accessToken || value?.access_token,
  };
}

async function requestJson(url:string, init:RequestInit = {}) {
  const response = await fetch(url, init);
  const text = await response.text();
  let body:any = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = { raw: text }; }
  if (!response.ok) {
    const error = new Error('HOTMART_HTTP_'+response.status);
    (error as any).status = response.status;
    (error as any).body = body;
    throw error;
  }
  return body;
}

async function getAccessToken(networkId:string) {
  const raw = await affiliateNetworkSecurityService.getCredentials(networkId);
  const c = cleanCredentials(raw);

  if (c.accessToken) return { token:c.accessToken, source:'stored_access_token' as const };

  if (!c.clientId || !c.clientSecret) throw new Error('HOTMART_CREDENTIALS_INCOMPLETE');

  const basic = Buffer.from(c.clientId+':'+c.clientSecret).toString('base64');
  const body = new URLSearchParams({ grant_type:'client_credentials' });

  const result = await requestJson(OAUTH_URL, {
    method:'POST',
    headers:{
      Authorization:'Basic '+basic,
      'Content-Type':'application/x-www-form-urlencoded',
      Accept:'application/json'
    },
    body
  });

  if (!result?.access_token) throw new Error('HOTMART_ACCESS_TOKEN_NOT_RETURNED');
  return { token:String(result.access_token), source:'client_credentials' as const, expiresIn:result.expires_in };
}

async function hotmartGet(networkId:string,path:string,params:Record<string,string|number|undefined>={}) {
  const {token}=await getAccessToken(networkId);
  const url = new URL(API_BASE+path);
  for (const [k,v] of Object.entries(params)) if(v!==undefined && v!==null && v!=='') url.searchParams.set(k,String(v));
  return requestJson(url.toString(), {
    headers:{Authorization:'Bearer '+token,Accept:'application/json','Content-Type':'application/json'}
  });
}

function mapProduct(raw:any) {
  return {
    externalId: raw?.id==null ? undefined : String(raw.id),
    name: String(raw?.name || 'Produto Hotmart'),
    category: raw?.format || null,
    description: raw?.description || null,
    recurring: Boolean(raw?.is_subscription),
    metadata: raw,
    url: raw?.url || null,
    salesPageUrl: raw?.sales_page_url || raw?.checkout_url || null,
    price: raw?.price?.value ?? raw?.price ?? null,
    commissionRate: raw?.commission_rate ?? raw?.commissionRate ?? null,
    commissionAmount: raw?.commission_amount ?? raw?.commissionAmount ?? null
  };
}

export const hotmartAdapter = {
  async test(networkId:string) {
    const result = await hotmartGet(networkId,'/products/api/v1/products',{max_results:1});
    return {ok:true,network:'hotmart',authenticated:true,sampleCount:Array.isArray(result?.items)?result.items.length:0};
  },

  async listProducts(networkId:string, options:{maxResults?:number,pageToken?:string,status?:string,format?:string}={}) {
    const result = await hotmartGet(networkId,'/products/api/v1/products',{
      max_results:Math.min(Math.max(Number(options.maxResults||50),1),50),
      page_token:options.pageToken,
      status:options.status,
      format:options.format
    });
    return {
      items:Array.isArray(result?.items)?result.items.map(mapProduct):[],
      pageInfo:result?.page_info || null,
      raw:result
    };
  },

  async syncProducts(networkId:string, options:{maxResults?:number,status?:string,format?:string}={}) {
    const result = await this.listProducts(networkId,options);
    const products = result.items;
    return {networkId,source:'hotmart',count:products.length,products,pageInfo:result.pageInfo};
  },

  async salesHistory(networkId:string, options:{maxResults?:number,pageToken?:string,productId?:number,startDate?:number,endDate?:number,transactionStatus?:string,commissionAs?:string}={}) {
    return hotmartGet(networkId,'/payments/api/v1/sales/history',{
      max_results:Math.min(Math.max(Number(options.maxResults||50),1),50),
      page_token:options.pageToken,
      product_id:options.productId,
      start_date:options.startDate,
      end_date:options.endDate,
      transaction_status:options.transactionStatus,
      commission_as:options.commissionAs
    });
  },

  async subscriptions(networkId:string, options:{maxResults?:number,pageToken?:string,productId?:number,status?:string}={}) {
    return hotmartGet(networkId,'/payments/api/v1/subscriptions',{
      max_results:Math.min(Math.max(Number(options.maxResults||50),1),50),
      page_token:options.pageToken,
      product_id:options.productId,
      status:options.status
    });
  }
};
