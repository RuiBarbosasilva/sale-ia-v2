import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import axios from 'axios';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import JSZip from 'jszip';
import { prisma } from '../modules/mercadoLivre/lib/prisma';
import editorialAIService from './editorialAIService';

const ROOT = path.resolve(process.env.EDITORIAL_STORAGE_PATH || 'storage/editorial');
function clamp(n:number){ return Math.max(0, Math.min(100, Math.round(n))); }
function slugify(s:string){ return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,80); }
function words(s:string){ return s.trim().split(/\s+/).filter(Boolean).length; }
async function ensureDir(p:string){ await fs.mkdir(p,{recursive:true}); }
async function write(p:string,data:string|Buffer){ await ensureDir(path.dirname(p)); await fs.writeFile(p,data); return p; }
function esc(s:string){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;');}

export const editorialFactoryService = {
 async research(input:any){
  const topic=String(input.topic||'').trim(); if(!topic) throw new Error('TOPIC_REQUIRED');
  const market=input.market||'BR', language=input.language||'pt-BR'; const sources:any[]=[];
  if(input.sourceUrl){ try{ const r=await axios.get(input.sourceUrl,{timeout:15000,headers:{'User-Agent':'SALE-IA-V2 Editorial Research/1.0'}}); const t=typeof r.data==='string'?r.data:JSON.stringify(r.data); sources.push({...input,sourceType:input.sourceType||'WEB',sourceTitle:input.sourceTitle||input.sourceUrl,snippet:t.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').slice(0,1500),data:{status:r.status}}); }catch(e:any){sources.push({...input,sourceType:'WEB_ERROR',snippet:e?.message||'fetch failed'});} }
  else sources.push({...input,sourceType:input.sourceType||'MANUAL',sourceTitle:input.sourceTitle||'Pesquisa editorial',snippet:input.snippet||''});
  const created=[]; for(const s of sources) created.push(await prisma.editorialResearch.create({data:{topic,market,language,sourceType:s.sourceType||'WEB',sourceUrl:s.sourceUrl,sourceTitle:s.sourceTitle,snippet:s.snippet,data:s.data?JSON.stringify(s.data):undefined}}));
  const text=created.map(x=>x.snippet||'').join(' '); const demand=clamp(45+Math.min(35,words(text)/40)); const trend=clamp(40+(text.match(/tend|2026|novo|cresce|busca|popular/gi)||[]).length*6); const competition=clamp(35+(text.match(/concorr|curso|livro|ebook|milhares/gi)||[]).length*5); const saturation=clamp(30+(text.match(/muito|satur|milhares|centenas/gi)||[]).length*7); const commercial=clamp(demand*.35+trend*.25+(100-competition)*.2+(100-saturation)*.2); const opportunity=clamp(demand*.25+trend*.2+(100-competition)*.15+(100-saturation)*.15+commercial*.25);
  const opp=await prisma.editorialOpportunity.create({data:{topic,market,language,audience:'Leitor interessado no tema',demandScore:demand,trendScore:trend,competitionScore:competition,saturationScore:saturation,commercialScore:commercial,opportunityScore:opportunity,status:opportunity>=70?'SHORTLISTED':'ANALYZED',reasoning:'Pontuação inicial baseada nas evidências ingeridas. Conecte um provedor de busca para pesquisa contínua.',researchIds:JSON.stringify(created.map(x=>x.id))}}); return {research:created,opportunity:opp};
 },
 async listOpportunities(limit=50){ return prisma.editorialOpportunity.findMany({orderBy:{opportunityScore:'desc'},take:Math.min(limit,200),include:{projects:{select:{id:true,title:true,status:true,qualityScore:true,productType:true}}}}); },
 async createProject(data:any){ const opp=data.opportunityId?await prisma.editorialOpportunity.findUnique({where:{id:data.opportunityId}}):null; const topic=data.topic||opp?.topic; if(!topic) throw new Error('TOPIC_REQUIRED'); return prisma.editorialProject.create({data:{opportunityId:data.opportunityId,productType:data.productType||'EBOOK',title:data.title||topic,subtitle:data.subtitle,author:data.author||'SALE-IA Editorial',audience:data.audience||opp?.audience||'Leitores interessados no tema',language:data.language||opp?.language||'pt-BR',market:data.market||opp?.market||'BR',status:'OUTLINE'}}); },
 async generate(projectId:string){
  const p=await prisma.editorialProject.findUnique({where:{id:projectId},include:{opportunity:true}});
  if(!p) throw new Error('PROJECT_NOT_FOUND');
  const researchIds=p.opportunity?.researchIds ? JSON.parse(p.opportunity.researchIds) : [];
  const researchRows=researchIds.length ? await prisma.editorialResearch.findMany({where:{id:{in:researchIds}}}) : [];
  const research=researchRows.map(r=>[
    r.sourceTitle||r.sourceType||'Fonte',
    r.sourceUrl||'',
    r.snippet||''
  ].join(' | ')).join('\n').slice(0,20000);

  await prisma.editorialProject.update({where:{id:projectId},data:{status:'GENERATING',errorMessage:null}});

  if(!editorialAIService.configured()){
    const outline=['Introdução','Fundamentos essenciais','Método passo a passo','Erros comuns e como evitar','Aplicação prática','Checklist de implementação','Conclusão e próximos passos'];
    const chapters=outline.map((t,i)=>({position:i+1,title:t,content:t+'\\n\\nEste capítulo apresenta um texto-base estruturado sobre '+(p.title||'o tema')+'.\\n\\nEste material está em modo de contingência e precisa de geração/revisão por um provedor de IA antes de ser considerado conteúdo comercial final.',wordCount:words(t+' Este capítulo apresenta um texto-base estruturado sobre o tema.'),status:'DRAFT'}));
    await prisma.editorialChapter.deleteMany({where:{projectId}});
    await prisma.editorialChapter.createMany({data:chapters.map(c=>({...c,projectId}))});
    const manuscript=['# '+(p.title||'Livro'),p.subtitle?'## '+p.subtitle:'','Autor: '+(p.author||'SALE-IA Editorial')].concat(chapters.map(c=>'\\n## '+c.title+'\\n\\n'+c.content)).filter(Boolean).join('\\n');
    const manuscriptPath=await write(path.join(ROOT,projectId,'manuscript.md'),manuscript);
    await prisma.editorialProject.update({where:{id:projectId},data:{manuscript,status:'REVIEW',manuscriptPath,generationProvider:'fallback',generationModel:'editorial-base-v2'}});
    return prisma.editorialProject.findUnique({where:{id:projectId},include:{chapters:true}});
  }

  try{
    const plan=await editorialAIService.createEditorialPlan({
      title:p.title||p.opportunity?.topic||'Novo livro',
      audience:p.audience||p.opportunity?.audience||'Leitores interessados no tema',
      language:p.language,market:p.market,productType:p.productType,research
    });
    const finalTitle=String(plan.data.title||p.title||'Novo livro').trim();
    const subtitle=plan.data.subtitle ? String(plan.data.subtitle).trim() : null;
    const audience=plan.data.audience ? String(plan.data.audience).trim() : p.audience;
    const description=plan.data.description ? String(plan.data.description).trim() : null;
    const planned=Array.isArray(plan.data.chapters) ? plan.data.chapters : [];
    if(planned.length<5) throw new Error('EDITORIAL_AI_OUTLINE_TOO_SHORT');

    await prisma.editorialProject.update({where:{id:projectId},data:{
      title:finalTitle,subtitle,audience,description,
      metadata:JSON.stringify(plan.data.metadata||{}),
      generationProvider:plan.meta.provider,generationModel:plan.meta.model
    }});
    await prisma.editorialChapter.deleteMany({where:{projectId}});

    const targetWords=Math.max(500,Number(process.env.EDITORIAL_WORDS_PER_CHAPTER||900));
    const chapters:any[]=[];
    let previousSummary='';
    for(let i=0;i<planned.length;i++){
      const c=planned[i]||{};
      const chapter=await editorialAIService.createChapter({
        title:finalTitle,subtitle,chapterTitle:String(c.title||('Capítulo '+(i+1))),
        chapterGoal:String(c.goal||'Desenvolver o tema com aplicação prática'),
        keyPoints:Array.isArray(c.keyPoints)?c.keyPoints.map(String):[],
        previousSummary,research,audience:String(audience||''),language:p.language,targetWords
      });
      const content=chapter.text.trim();
      if(words(content)<250) throw new Error('EDITORIAL_AI_CHAPTER_TOO_SHORT_'+(i+1));
      const row=await prisma.editorialChapter.create({data:{
        projectId,position:i+1,title:String(c.title||('Capítulo '+(i+1))),content,
        wordCount:words(content),status:'DRAFT'
      }});
      chapters.push(row);
      previousSummary=(previousSummary+'\n'+row.title+': '+content.slice(-1200)).slice(-5000);
    }

    const manuscript=['# '+finalTitle,subtitle?'## '+subtitle:'','Autor: '+(p.author||'SALE-IA Editorial')].concat(
      chapters.map(c=>'\\n## '+c.title+'\\n\\n'+c.content)
    ).filter(Boolean).join('\\n');
    const manuscriptPath=await write(path.join(ROOT,projectId,'manuscript.md'),manuscript);
    await prisma.editorialProject.update({where:{id:projectId},data:{
      title:finalTitle,subtitle,audience,description,manuscript,manuscriptPath,status:'REVIEW',
      generationProvider:plan.meta.provider,generationModel:plan.meta.model
    }});

    let review:any=null;
    try{
      review=await editorialAIService.reviewManuscript({title:finalTitle,manuscript,research,language:p.language});
      await prisma.editorialQualityCheck.create({data:{
        projectId,checkType:'AI_EDITORIAL_REVIEW',status:review.data.approved?'PASS':'REVIEW',
        score:Number(review.data.score)||0,details:JSON.stringify(review.data)
      }});
    }catch(e:any){
      await prisma.editorialQualityCheck.create({data:{
        projectId,checkType:'AI_EDITORIAL_REVIEW',status:'REVIEW',score:0,
        details:e?.message||'AI review failed'
      }});
    }
    return {project:await prisma.editorialProject.findUnique({where:{id:projectId},include:{chapters:true}}),plan:plan.data,review:review?.data||null};
  }catch(e:any){
    await prisma.editorialProject.update({where:{id:projectId},data:{status:'ERROR',errorMessage:e?.message||'EDITORIAL_GENERATION_ERROR'}});
    throw e;
  }
 },
 async qualityGate(projectId:string){
  const p=await prisma.editorialProject.findUnique({where:{id:projectId},include:{chapters:true,checks:true}});
  if(!p) throw new Error('PROJECT_NOT_FOUND');
  const checks:any[]=[];
  const count=p.chapters.length;
  const total=p.chapters.reduce((a,c)=>a+c.wordCount,0);
  const minWords=p.productType==='COLORING_BOOK'?0:Math.max(1800,Number(process.env.EDITORIAL_MIN_WORDS||6000));

  checks.push({checkType:'MANUSCRIPT_PRESENT',status:p.manuscript&&p.manuscript.length>100?'PASS':'FAIL',score:p.manuscript&&p.manuscript.length>100?100:0,details:total+' palavras estimadas'});
  checks.push({checkType:'CHAPTER_STRUCTURE',status:count>=5?'PASS':'FAIL',score:count>=5?100:40,details:count+' capítulos'});
  checks.push({checkType:'MINIMUM_WORD_COUNT',status:total>=minWords?'PASS':'FAIL',score:total>=minWords?100:40,details:total+' / '+minWords+' palavras'});
  const bad=/(TODO|TBD|LOREM IPSUM|\[INSIRA|TEXTO-BASE|EDITORIAL_BASE)/i.test(p.manuscript||'');
  checks.push({checkType:'PLACEHOLDER_SCAN',status:bad?'FAIL':'PASS',score:bad?0:100,details:'varredura de placeholders'});
  checks.push({checkType:'METADATA',status:p.title&&p.author?'PASS':'FAIL',score:p.title&&p.author?100:40,details:'título e autor'});

  const aiReview=p.checks.find((c:any)=>c.checkType==='AI_EDITORIAL_REVIEW');
  if(aiReview){
    checks.push({checkType:'AI_EDITORIAL_REVIEW',status:aiReview.status==='PASS'?'PASS':'FAIL',score:Number(aiReview.score)||0,details:aiReview.details||''});
  } else {
    checks.push({checkType:'AI_EDITORIAL_REVIEW',status:'FAIL',score:0,details:'Revisão editorial por IA não encontrada.'});
  }

  await prisma.editorialQualityCheck.deleteMany({where:{projectId}});
  await prisma.editorialQualityCheck.createMany({data:checks.map(c=>({...c,projectId}))});
  const score=checks.reduce((a,c)=>a+c.score,0)/checks.length;
  const status=checks.every(c=>c.status==='PASS')&&score>=85?'READY':'REVIEW';
  await prisma.editorialProject.update({where:{id:projectId},data:{qualityScore:score,status}});
  return {projectId,score,status,checks,totalWords:total};
 },
 async render(projectId:string){
  const p=await prisma.editorialProject.findUnique({where:{id:projectId},include:{chapters:true}}); if(!p) throw new Error('PROJECT_NOT_FOUND'); if(p.status!=='READY') throw new Error('QUALITY_GATE_REQUIRED'); const dir=path.join(ROOT,projectId); await ensureDir(dir);
  const pdf=await PDFDocument.create(); const font=await pdf.embedFont(StandardFonts.Helvetica); const bold=await pdf.embedFont(StandardFonts.HelveticaBold); let page=pdf.addPage([595,842]); let y=790;
  const line=(txt:string,size=11,b=false)=>{if(y<55){page=pdf.addPage([595,842]);y=790;} page.drawText(txt.slice(0,105),{x:55,y,size,font:b?bold:font,color:rgb(.12,.12,.12)});y-=size+8;};
  line(p.title||'Livro',24,true); if(p.subtitle)line(p.subtitle,14); line(''); line('Autor: '+(p.author||'SALE-IA Editorial'),11,true);
  for(const c of p.chapters){line('');line(c.title,18,true);for(const para of c.content.split(/\n+/).filter(Boolean)){for(const part of para.match(/.{1,100}(?:\s|$)/g)||[para])line(part.trim());}}
  const pdfBytes=await pdf.save(); const pdfPath=await write(path.join(dir,'interior.pdf'),Buffer.from(pdfBytes));
  const cover='<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="2560"><rect width="100%" height="100%" fill="#111827"/><rect x="110" y="110" width="1380" height="2340" fill="none" stroke="#f3f4f6" stroke-width="4"/><text x="800" y="900" text-anchor="middle" fill="white" font-family="Arial" font-size="92" font-weight="700">'+esc(p.title||'Livro')+'</text><text x="800" y="1040" text-anchor="middle" fill="#d1d5db" font-family="Arial" font-size="42">'+esc(p.subtitle||'Guia prático')+'</text><text x="800" y="2250" text-anchor="middle" fill="white" font-family="Arial" font-size="44">'+esc(p.author||'SALE-IA Editorial')+'</text></svg>';
  const coverPath=await write(path.join(dir,'cover.svg'),cover); const epubPath=await write(path.join(dir,'book.epub'),await makeEpub(p.title||'Livro',p.author||'SALE-IA Editorial',p.chapters)); await prisma.editorialProject.update({where:{id:projectId},data:{pdfPath,coverPath,interiorPath:pdfPath,epubPath,status:'READY'}}); await prisma.editorialAsset.createMany({data:[{projectId,type:'COVER',path:coverPath,altText:p.title||'Capa'},{projectId,type:'INTERIOR_PDF',path:pdfPath},{projectId,type:'EPUB',path:epubPath}]}); return {pdfPath,epubPath,coverPath};
 },
 async createLandingPage(projectId:string,checkoutUrl?:string){ const p=await prisma.editorialProject.findUnique({where:{id:projectId}}); if(!p)throw new Error('PROJECT_NOT_FOUND'); const slug=slugify(p.title||projectId); const lp=await prisma.editorialLandingPage.upsert({where:{slug},update:{checkoutUrl},create:{projectId,slug,title:p.title||'Livro',headline:p.subtitle||p.title||'Um guia prático',body:'Conteúdo estruturado, aplicação passo a passo e materiais de apoio.',ctaText:'Quero acessar agora',checkoutUrl}}); const html='<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>'+esc(lp.title)+'</title><style>body{font-family:Arial;max-width:760px;margin:60px auto;padding:24px;line-height:1.7}h1{font-size:44px}a{display:inline-block;padding:16px 24px;background:#111827;color:white;text-decoration:none;border-radius:10px}</style><h1>'+esc(lp.headline)+'</h1><p>'+esc(lp.body)+'</p><a href="'+esc(lp.checkoutUrl||'#')+'">'+esc(lp.ctaText)+'</a></html>'; const htmlPath=await write(path.join(ROOT,projectId,'landing.html'),html); return prisma.editorialLandingPage.update({where:{id:lp.id},data:{htmlPath,status:'READY'}}); },
 async publishPlan(projectId:string){ const p=await prisma.editorialProject.findUnique({where:{id:projectId}}); if(!p)throw new Error('PROJECT_NOT_FOUND'); if(p.status!=='READY') throw new Error('QUALITY_GATE_REQUIRED'); const platforms=['KDP','HOTMART','EDUZZ','KIWIFY','BRAIP','MONETIZZE','GUMROAD','KOBO']; const rows=[]; for(const platform of platforms)rows.push(await prisma.editorialPublication.upsert({where:{projectId_platform:{projectId,platform}},update:{status:'MANUAL_REQUIRED'},create:{projectId,platform,status:'MANUAL_REQUIRED'}})); return rows; }
}
async function makeEpub(title:string,author:string,chapters:any[]){ const z=new JSZip(); z.file('mimetype','application/epub+zip',{compression:'STORE'}); z.file('META-INF/container.xml','<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>'); const items=chapters.map((c,i)=>'<item id="c'+i+'" href="c'+i+'.xhtml" media-type="application/xhtml+xml"/>').join(''); const spine=chapters.map((c,i)=>'<itemref idref="c'+i+'"/>').join(''); z.file('OEBPS/content.opf','<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="2.0" unique-identifier="bookid"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="bookid">'+crypto.randomUUID()+'</dc:identifier><dc:title>'+esc(title)+'</dc:title><dc:creator>'+esc(author)+'</dc:creator><dc:language>pt-BR</dc:language></metadata><manifest>'+items+'</manifest><spine>'+spine+'</spine></package>'); z.file('OEBPS/toc.ncx','<?xml version="1.0"?><ncx xmlns="http://www.daisy.org/z3986/2005/ncx/"><docTitle><text>'+esc(title)+'</text></docTitle><navMap>'+chapters.map((c,i)=>'<navPoint id="n'+i+'" playOrder="'+(i+1)+'"><navLabel><text>'+esc(c.title)+'</text></navLabel><content src="c'+i+'.xhtml"/></navPoint>').join('')+'</navMap></ncx>'); chapters.forEach((c,i)=>z.file('OEBPS/c'+i+'.xhtml','<?xml version="1.0" encoding="utf-8"?><html xmlns="http://www.w3.org/1999/xhtml"><head><title>'+esc(c.title)+'</title></head><body><h1>'+esc(c.title)+'</h1>'+c.content.split(/\n+/).filter(Boolean).map((x:string)=>'<p>'+esc(x)+'</p>').join('')+'</body></html>')); return z.generateAsync({type:'nodebuffer'}); }