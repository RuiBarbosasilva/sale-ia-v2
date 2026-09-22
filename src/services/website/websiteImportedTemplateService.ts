import { PrismaClient } from '@prisma/client';
import JSZip from 'jszip';

const prisma = new PrismaClient();
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const MAX_UNCOMPRESSED_BYTES = 50 * 1024 * 1024;
const MAX_FILES = 250;

function slugify(value: string): string {
  return (value || 'modelo-importado').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'modelo-importado';
}
function mimeFor(path: string): string {
  const ext = path.toLowerCase().split('.').pop() || '';
  const map: Record<string,string> = { png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',gif:'image/gif',svg:'image/svg+xml',ico:'image/x-icon',avif:'image/avif',woff:'font/woff',woff2:'font/woff2',ttf:'font/ttf',otf:'font/otf' };
  return map[ext] || 'application/octet-stream';
}
function safeZipPath(name: string): string {
  const normalized = name.replace(/\\/g, '/').replace(/^\/+/, '');
  const parts = normalized.split('/');
  if (parts.some(p => p === '..' || p === '.')) throw new Error('ZIP contém caminho inseguro');
  return parts.join('/');
}
async function inlineZipAssets(html: string, files: Map<string,Buffer>): Promise<string> {
  const resolve = (raw: string): string|null => {
    const clean = raw.trim().replace(/^['"]|['"]$/g,'').split('#')[0].split('?')[0];
    if (!clean || /^(https?:|data:|mailto:|tel:|javascript:|#)/i.test(clean)) return null;
    const candidates = [clean, clean.replace(/^\.\//,''), clean.replace(/^\//,'')];
    for (const c of candidates) if (files.has(c)) return c;
    return null;
  };
  let out = html;
  out = out.replace(/\b(?:src|href)=(["'])([^"']+)\1/gi, (full,q,raw) => {
    const path = resolve(raw); if (!path) return full;
    const data = files.get(path)!; const mime = mimeFor(path);
    if (/^text\/css$/i.test(mime)) return full;
    if (/^(text\/javascript|application\/json)$/i.test(mime)) return full;
    return full.replace(raw, 'data:' + mime + ';base64,' + data.toString('base64'));
  });
  out = out.replace(/url\(([^)]+)\)/gi, (full,raw) => {
    const path = resolve(raw); if (!path) return full;
    const data = files.get(path)!;
    return 'url(data:' + mimeFor(path) + ';base64,' + data.toString('base64') + ')';
  });
  for (const [cssPath, data] of files.entries()) {
    if (!/\.css$/i.test(cssPath)) continue;
    const escaped = cssPath.replace(/[.*+?^$()|[\]\\]/g,'\\$&');
    const link = new RegExp(`<link[^>]+href=["']([^"']*)${escaped}[^>]*>`, 'i');
    if (!link.test(out)) continue;
    let css = data.toString('utf8');
    css = css.replace(/url\(([^)]+)\)/gi, (full,raw) => {
      const path = resolve(raw); if (!path) return full;
      return 'url(data:' + mimeFor(path) + ';base64,' + files.get(path)!.toString('base64') + ')';
    });
    out = out.replace(link, '<style data-imported-template-css>' + css + '</style>');
  }
  return out;
}
function renderTemplateHtml(html: string, data: any): string {
  const values: Record<string,string> = {
    businessName:data.businessName||'', companyName:data.businessName||'', city:data.city||'',
    phone:data.phone||data.whatsapp||'', whatsapp:data.whatsapp||data.phone||'', email:data.email||'',
    instagram:data.instagram||'', website:data.website||'', category:data.category||'', segment:data.category||'',
    description:data.description||'', ctaText:data.ctaText||'Fale conosco', year:String(new Date().getFullYear())
  };
  let out = html;
  for (const [key,value] of Object.entries(values)) {
    const safe = value.replace(/\\/g,'\\\\').replace(/\$/g,'$$$$');
    for (const p of [
      new RegExp('\\{\\{\\s*'+key+'\\s*\\}\\}','gi'),
      new RegExp('\\[\\[\\s*'+key+'\\s*\\]\\]','gi'),
      new RegExp('%%'+key+'%%','gi')
    ]) out = out.replace(p,safe);
  }
  if (values.businessName) out = out.replace(/<title>([\s\S]*?)<\/title>/i,'<title>'+values.businessName.replace(/</g,'&lt;')+'</title>');
  return out;
}
export class WebsiteImportedTemplateService {
  async importFile(file:{originalname:string;mimetype:string;size:number;buffer:Buffer}, metadata:any={}) {
    if (!file?.buffer) throw new Error('Arquivo não recebido');
    if (file.size > MAX_UPLOAD_BYTES) throw new Error('Arquivo excede o limite de 20 MB');
    const original=file.originalname||'modelo';
    const isZip=/\.zip$/i.test(original)||/application\/(?:zip|x-zip-compressed)/i.test(file.mimetype);
    let html=''; const sourceType=isZip?'ZIP':'HTML';
    if (isZip) {
      const zip=await JSZip.loadAsync(file.buffer,{createFolders:false});
      const entries=Object.values(zip.files).filter((e:any)=>!e.dir);
      if(entries.length>MAX_FILES) throw new Error('ZIP contém arquivos demais (limite: 250)');
      let total=0; const files=new Map<string,Buffer>();
      for(const entry of entries as any[]) {
        const path=safeZipPath(entry.name); const data=await entry.async('nodebuffer');
        total+=data.length; if(total>MAX_UNCOMPRESSED_BYTES) throw new Error('ZIP descompactado excede o limite de 50 MB');
        files.set(path,data);
      }
      const indexName=[...files.keys()].find(k=>/^index\.html?$/i.test(k))||[...files.keys()].find(k=>/(^|\/)index\.html?$/i.test(k));
      if(!indexName) throw new Error('ZIP precisa conter um index.html');
      html=await inlineZipAssets(files.get(indexName)!.toString('utf8'),files);
    } else {
      if(!/\.html?$/i.test(original)&&!/text\/html/i.test(file.mimetype)) throw new Error('Envie um arquivo .html ou .htm');
      html=file.buffer.toString('utf8');
      if(!/<html[\s>]/i.test(html)&&!/<body[\s>]/i.test(html)) throw new Error('O arquivo HTML parece inválido');
    }
    const baseName=String(metadata.name||original.replace(/\.zip$/i,'').replace(/\.html?$/i,'')||'Modelo importado').trim();
    let slug=slugify(baseName);
    if(await prisma.websiteImportedTemplate.findUnique({where:{slug}})) slug += '-' + Date.now().toString(36).slice(-6);
    return prisma.websiteImportedTemplate.create({data:{
      name:baseName.slice(0,120),slug,description:metadata.description?String(metadata.description).slice(0,500):null,
      segment:metadata.segment?String(metadata.segment).slice(0,80):null,sourceType,html,
      archiveData:isZip?file.buffer:undefined,active:true
    }});
  }
  async listActive(){ return prisma.websiteImportedTemplate.findMany({where:{active:true},orderBy:{createdAt:'desc'},select:{id:true,name:true,slug:true,description:true,segment:true,sourceType:true,active:true,createdAt:true}}); }
  async get(id:string){ return prisma.websiteImportedTemplate.findUnique({where:{id}}); }
  async render(id:string,customData:any){ const t=await this.get(id); if(!t||!t.active) throw new Error('Modelo importado não encontrado'); return renderTemplateHtml(t.html,customData); }
}
export const websiteImportedTemplateService=new WebsiteImportedTemplateService();
