import { Router, Request, Response } from 'express';
import { prisma } from '../modules/mercadoLivre/lib/prisma';

const router = Router();

router.get('/overview', async (req: Request, res: Response) => {
  try {
    const [baseModels, importedModels] = await Promise.all([
      prisma.websiteTemplate.count({ where: { active: true } }),
      prisma.websiteImportedTemplate.count({ where: { active: true } })
    ]);
    const totalModels = baseModels + importedModels;
    const totalCategories = await prisma.websiteCategory.count({ where: { active: true } });
    const totalProspects = await prisma.websiteProspect.count();
    const totalDemos = await prisma.websiteDemo.count({ where: { status: 'READY' } });
    const totalProposals = await prisma.websiteProposal.count();
    const totalSales = await prisma.websiteProposal.count({ where: { status: 'ACCEPTED' } });
    
    // WebsiteProposal atualmente não possui campo de preço.
    // A receita será calculada quando houver um campo financeiro
    // próprio no modelo de propostas.
    const revenue = 0;
    
    res.json({
      success: true,
      data: {
        totalModels,
        totalCategories,
        totalProspects,
        totalDemos,
        totalProposals,
        totalSales,
        revenue
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
