import crypto from 'crypto';
import {prisma} from '../modules/mercadoLivre/lib/prisma';

const MAX_CREDENTIAL_BYTES = 32 * 1024;

function key(){
 const raw=process.env.AFFILIATE_CREDENTIALS_KEY||'';
 if(!/^[0-9a-fA-F]{64}$/.test(raw)) throw new Error('AFFILIATE_CREDENTIALS_KEY_INVALID');
 return Buffer.from(raw,'hex');
}
function validateCredentials(value: unknown) {
 if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error('INVALID_CREDENTIALS');
 const serialized = JSON.stringify(value);
 if (Buffer.byteLength(serialized, 'utf8') > MAX_CREDENTIAL_BYTES) throw new Error('CREDENTIALS_TOO_LARGE');
 return value;
}
function encrypt(value:unknown){
 const safe=validateCredentials(value);
 const iv=crypto.randomBytes(12), k=key(), cipher=crypto.createCipheriv('aes-256-gcm',k,iv);
 const data=Buffer.from(JSON.stringify(safe),'utf8');
 const enc=Buffer.concat([cipher.update(data),cipher.final()]);
 return [iv.toString('hex'),cipher.getAuthTag().toString('hex'),enc.toString('base64')].join('.');
}
function decrypt(token:string){
 const parts=token.split('.');
 if(parts.length!==3) throw new Error('CREDENTIALS_INVALID_FORMAT');
 const [ivHex,tagHex,data]=parts;
 if(!/^[0-9a-f]{24}$/i.test(ivHex)||!/^[0-9a-f]{32}$/i.test(tagHex)) throw new Error('CREDENTIALS_INVALID_FORMAT');
 const decipher=crypto.createDecipheriv('aes-256-gcm',key(),Buffer.from(ivHex,'hex'));
 decipher.setAuthTag(Buffer.from(tagHex,'hex'));
 return validateCredentials(JSON.parse(Buffer.concat([decipher.update(Buffer.from(data,'base64')),decipher.final()]).toString('utf8')));
}
export const affiliateNetworkSecurityService={
 async setCredentials(id:string,credentials:unknown){
  const n=await prisma.affiliateNetwork.findUnique({where:{id}});if(!n)throw new Error('NETWORK_NOT_FOUND');
  await prisma.affiliateNetwork.update({where:{id},data:{credentialsEncrypted:encrypt(credentials),credentialStatus:'CONFIGURED'}});
  return {id,credentialStatus:'CONFIGURED'};
 },
 async getCredentials(id:string){
  const n=await prisma.affiliateNetwork.findUnique({where:{id}});if(!n)throw new Error('NETWORK_NOT_FOUND');
  if(!n.credentialsEncrypted)throw new Error('CREDENTIALS_NOT_CONFIGURED');
  return decrypt(n.credentialsEncrypted);
 },
 async clearCredentials(id:string){
  const n=await prisma.affiliateNetwork.findUnique({where:{id}});if(!n)throw new Error('NETWORK_NOT_FOUND');
  await prisma.affiliateNetwork.update({where:{id},data:{credentialsEncrypted:null,credentialStatus:'NOT_CONFIGURED'}});
  return {id,credentialStatus:'NOT_CONFIGURED'};
 }
};