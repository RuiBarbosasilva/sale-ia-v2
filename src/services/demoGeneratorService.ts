import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class DemoGeneratorService {
  async generateDemo(prospectId: string) {
    const prospect = await prisma.websiteProspect.findUnique({
      where: { id: prospectId }
    });

    if (!prospect) {
      throw new Error('WebsiteProspect não encontrado');
    }

    const businessName = prospect.companyName || 'Sua Empresa';
    const segment = prospect.segment || 'negócio';
    const city = prospect.city || 'sua cidade';
    const phone = prospect.phone || '0000-0000';
    const cleanPhone = phone.replace(/\D/g, '');
    const whatsappLink = cleanPhone.length >= 10 ? `https://wa.me/55${cleanPhone}` : '#';

    const sourceCode = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${businessName} - ${segment} em ${city}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Segoe UI', sans-serif; }
        body { color: #333; line-height: 1.6; }
        header { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 60px 20px; text-align: center; }
        header h1 { font-size: 2.5rem; margin-bottom: 10px; }
        .cta-button { display: inline-block; margin-top: 20px; padding: 15px 30px; background: #10b981; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; }
        section { padding: 60px 20px; max-width: 1000px; margin: 0 auto; text-align: center; }
        .services { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 30px; margin-top: 40px; }
        .service-card { background: #f8fafc; padding: 30px; border-radius: 12px; border: 1px solid #e2e8f0; }
        footer { background: #1e293b; color: white; text-align: center; padding: 30px 20px; margin-top: 60px; }
    </style>
</head>
<body>
    <header>
        <h1>${businessName}</h1>
        <p>A melhor solução em ${segment} na região de ${city}</p>
        <a href="${whatsappLink}" class="cta-button">Solicitar Orçamento</a>
    </header>
    <section>
        <h2>Nossos Diferenciais</h2>
        <div class="services">
            <div class="service-card"><h3>Qualidade</h3><p>Compromisso com a excelência.</p></div>
            <div class="service-card"><h3>Atendimento</h3><p>Solução ideal para você.</p></div>
            <div class="service-card"><h3>Preço Justo</h3><p>Melhor custo-benefício.</p></div>
        </div>
    </section>
    <footer>
        <p>&copy; ${new Date().getFullYear()} ${businessName}. Site demonstrativo gerado por SALE-IA-V2</p>
    </footer>
</body>
</html>`;

    // Lógica segura: encontrar demo existente pelo prospectId ou criar nova
    const existingDemo = await prisma.websiteDemo.findFirst({
      where: { prospectId },
      orderBy: { version: 'desc' }
    });

    let demo;
    if (existingDemo) {
      demo = await prisma.websiteDemo.update({
        where: { id: existingDemo.id },
        data: {
          sourceCode,
          status: 'READY',
          version: existingDemo.version + 1,
          generatedAt: new Date()
        }
      });
    } else {
      demo = await prisma.websiteDemo.create({
        data: {
          prospectId,
          sourceCode,
          status: 'READY',
          version: 1,
          generatedAt: new Date()
        }
      });
    }

    await prisma.websiteProspect.update({
      where: { id: prospectId },
      data: { status: 'DEMO_READY' }
    });

    return demo;
  }
}

export const demoGeneratorService = new DemoGeneratorService();