import { RB_BENCHMARK_CATALOG } from './rbFactoryBenchmarkCatalog';

function esc(v:string){return v.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c));}
const palettes=[
 ['#0f172a','#f8fafc','#c8a96b'],['#183b35','#f7f3e9','#c99b45'],['#172554','#eff6ff','#38bdf8'],
 ['#111827','#f9fafb','#f97316'],['#2b2118','#faf7f2','#b7791f'],['#3f1d3a','#fff7fb','#e879b5'],
 ['#111827','#f3f4f6','#84cc16'],['#0b132b','#f7f8fa','#f59e0b'],['#16324f','#f5f0e8','#d97706'],['#12372a','#fbfdf8','#65a30d']
];
export const rbFactoryBenchmarkService={
  catalog(){return RB_BENCHMARK_CATALOG.map(n=>({...n,count:n.variants.length}));},
  find(niche:string,index:number){
    const n=RB_BENCHMARK_CATALOG.find(x=>x.slug===niche);
    if(!n||index<1||index>10) throw new Error('DEMO_NOT_FOUND');
    return {niche:n,variant:n.variants[index-1],index};
  },
  render(niche:string,index:number){
    const d=this.find(niche,index), p=palettes[(index-1)%palettes.length];
    const name=d.niche.name+' — Modelo '+String(index).padStart(2,'0');
    const services=d.niche.name==='Restaurantes'?['Cardápio digital','Reservas','Pedidos online']:d.niche.name==='Dentistas'?['Avaliação','Implantes','Ortodontia']:d.niche.name==='Fitness & Academias'?['Planos','Aulas','Treinos']:['Serviços principais','Atendimento','Orçamento'];
    const ref=d.niche.references[index-1];
    return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(name)}</title><style>
*{box-sizing:border-box}body{margin:0;font-family:Inter,Arial,sans-serif;color:${p[0]};background:${p[1]}}header{padding:22px 6vw;display:flex;justify-content:space-between;position:sticky;top:0;background:rgba(255,255,255,.92);backdrop-filter:blur(12px);z-index:3}nav a{margin-left:24px;color:inherit;text-decoration:none}.hero{min-height:72vh;padding:9vw 7vw;display:grid;grid-template-columns:1.2fr .8fr;gap:5vw;align-items:center;background:linear-gradient(135deg,${p[1]},#fff)}.eyebrow{letter-spacing:.16em;text-transform:uppercase;color:${p[2]};font-weight:700}.hero h1{font-size:clamp(3rem,7vw,7rem);line-height:.94;margin:18px 0}.hero p{font-size:1.2rem;max-width:650px;line-height:1.7}.btn{display:inline-block;padding:15px 24px;background:${p[0]};color:white;text-decoration:none;border-radius:999px;margin-top:20px}.visual{height:500px;border-radius:32px;background:linear-gradient(145deg,${p[0]},${p[2]});box-shadow:0 30px 80px #0002;display:flex;align-items:end;padding:30px;color:white;font-size:1.1rem}.section{padding:90px 7vw}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}.card{padding:30px;border:1px solid #0001;border-radius:22px;background:white;min-height:170px}.proof{background:${p[0]};color:white}.small{opacity:.7;font-size:.9rem}@media(max-width:800px){.hero{grid-template-columns:1fr}.visual{height:300px}.grid{grid-template-columns:1fr}}
</style></head><body><header><strong>RB FACTORY SITES</strong><nav><a href="#servicos">Serviços</a><a href="#prova">Confiança</a><a href="#contato">Contato</a></nav></header><main><section class="hero"><div><div class="eyebrow">${esc(d.niche.name)} · ${esc(d.variant)}</div><h1>Um site criado para transformar visitas em clientes.</h1><p>Demo original da RB Factory Sites, construída a partir de padrões de estrutura, UX, confiança e conversão observados em referências públicas do nicho.</p><a class="btn" href="#contato">Quero conversar</a><p class="small">Referência de estudo: ${esc(ref)}</p></div><div class="visual">Direção visual original · modelo ${index}/10</div></section><section id="servicos" class="section"><h2>Uma experiência clara para o cliente</h2><div class="grid">${services.map(s=>'<article class="card"><h3>'+esc(s)+'</h3><p>Apresentação objetiva, prova de valor e caminho direto para o próximo passo.</p></article>').join('')}</div></section><section id="prova" class="section proof"><h2>Confiança antes da decisão</h2><p>Depoimentos, avaliações, diferenciais, localização, equipe e informações essenciais podem ocupar esta área com dados reais do cliente.</p></section><section id="contato" class="section"><h2>Vamos adaptar este modelo ao seu negócio?</h2><p>Este é um modelo demonstrativo. O projeto final é personalizado para marca, cidade, serviços, público e objetivos reais.</p><a class="btn" href="#">Solicitar proposta</a></section></main></body></html>`;
  }
};
