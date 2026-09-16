import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export class SiteGeneratorService {
  async generateDemo(prospectId: string): Promise<{ demo: any; previewUrl: string }> {
    const p = await prisma.websiteProspect.findUnique({ where: { id: prospectId } });
    if (!p) throw new Error('Prospect nao encontrado');

    const name = p.companyName || 'Sua Empresa';
    const seg = p.segment || 'negocio';
    const city = p.city || 'sua cidade';
    const phone = (p.phone || '0000000000').replace(/\D/g, '');
    const zap = phone.length >= 10 ? `https://wa.me/55${phone}` : '#';

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${name} | ${seg} em ${city}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;line-height:1.6;color:#333}
header{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;padding:1rem 0;position:sticky;top:0;z-index:100}
nav{max-width:1200px;margin:0 auto;display:flex;justify-content:space-between;padding:0 20px;align-items:center}
.logo{font-size:1.5rem;font-weight:bold}.hero{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;padding:6rem 20px;text-align:center}
.hero h1{font-size:3rem;margin-bottom:1rem}.hero p{font-size:1.3rem;margin-bottom:2rem;opacity:0.9}
.cta{display:inline-block;background:#fff;color:#667eea;padding:1rem 2.5rem;border-radius:50px;text-decoration:none;font-weight:bold;font-size:1.1rem;transition:transform .3s}
.cta:hover{transform:translateY(-3px);box-shadow:0 10px 30px rgba(0,0,0,0.2)}
section{padding:4rem 20px;max-width:1200px;margin:0 auto}.section-title{text-align:center;font-size:2.5rem;margin-bottom:3rem}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:2rem}
.card{background:#fff;padding:2rem;border-radius:10px;box-shadow:0 5px 20px rgba(0,0,0,0.1);transition:transform .3s}.card:hover{transform:translateY(-5px)}
.card h3{color:#667eea;margin-bottom:1rem}.contact{background:#f8f9fa;text-align:center}
.btn-zap{background:#25D366;color:#fff;padding:1rem 2rem;border-radius:50px;text-decoration:none;font-weight:bold;display:inline-block;margin-top:1rem}
footer{background:#2d3748;color:#fff;text-align:center;padding:2rem 0;margin-top:4rem}
@media(max-width:768px){.hero h1{font-size:2rem}}
</style></head><body>
<header><nav><div class="logo">${name}</div></nav></header>
<section class="hero"><h1>${name}</h1><p>${seg} profissional em ${city}</p><a href="${zap}" class="cta">Solicitar Orcamento</a></section>
<section><h2 class="section-title">Nossos Servicos</h2><div class="grid">
<div class="card"><h3>Servico 1</h3><p>Solucao completa com qualidade e profissionalismo.</p></div>
<div class="card"><h3>Servico 2</h3><p>Atendimento personalizado e resultados garantidos.</p></div>
<div class="card"><h3>Servico 3</h3><p>Tecnologia e inovacao para o seu negocio.</p></div>
</div></section>
<section class="contact"><h2 class="section-title">Entre em Contato</h2><p>Estamos prontos para atender voce!</p><a href="${zap}" class="btn-zap">Falar no WhatsApp</a></section>
<footer><p>&copy; ${new Date().getFullYear()} ${name}. Todos os direitos reservados.</p></footer>
</body></html>`;

    let demo = await prisma.websiteDemo.findFirst({ where: { prospectId } });
    if (demo) {
      demo = await prisma.websiteDemo.update({ where: { id: demo.id }, data: { sourceCode: html, status: 'READY', version: demo.version + 1 } });
    } else {
      demo = await prisma.websiteDemo.create({ data: { prospectId, sourceCode: html, status: 'READY', version: 1 } });
    }
    await prisma.websiteProspect.update({ where: { id: prospectId }, data: { status: 'DEMO_READY' } });
    return { demo, previewUrl: `/api/site-sales/demo/${demo.id}` };
  }
}
export const siteGeneratorService = new SiteGeneratorService();