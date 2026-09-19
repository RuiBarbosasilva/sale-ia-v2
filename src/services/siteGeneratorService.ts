import { PrismaClient } from '@prisma/client';
import { renderProspectDemo } from './rbFactoryTemplateEngine';

const prisma = new PrismaClient();

export class SiteGeneratorService {
  async generateDemo(prospectId: string, options?: { niche?: string; modelIndex?: number }): Promise<{ demo: any; previewUrl: string; model: any }> {
    const p = await prisma.websiteProspect.findUnique({ where: { id: prospectId } });
    if (!p) throw new Error('Prospect nao encontrado');

    const rendered = renderProspectDemo({
      companyName: p.companyName || 'Sua Empresa',
      segment: p.segment || 'negocio',
      city: p.city || 'sua cidade',
      phone: p.phone || '',
      niche: options?.niche,
      modelIndex: options?.modelIndex,
    });

    let demo = await prisma.websiteDemo.findFirst({ where: { prospectId } });
    if (demo) {
      demo = await prisma.websiteDemo.update({
        where: { id: demo.id },
        data: { sourceCode: rendered.html, status: 'READY', version: demo.version + 1 },
      });
    } else {
      demo = await prisma.websiteDemo.create({
        data: { prospectId, sourceCode: rendered.html, status: 'READY', version: 1 },
      });
    }

    await prisma.websiteProspect.update({
      where: { id: prospectId },
      data: { status: 'DEMO_READY' },
    });

    return { demo, previewUrl: `/api/site-sales/demo/${demo.id}`, model: rendered.selection };
  }
}
export const siteGeneratorService = new SiteGeneratorService();
