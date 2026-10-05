import { Router, Request, Response } from 'express';
import { prisma } from '../modules/mercadoLivre/lib/prisma';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { categoryId, active, featured } = req.query;
    const where: any = {};
    if (categoryId) where.categoryId = categoryId as string;
    if (active !== undefined) where.active = active === 'true';
    if (featured !== undefined) where.featured = featured === 'true';
    
    const templates = await prisma.websiteTemplate.findMany({
      where,
      include: { category: true },
      orderBy: { featured: 'desc' }
    });
    res.json({ success: true, templates });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, categoryId, description, thumbnailUrl, demoUrl, sourceType, price, featured } = req.body;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const template = await prisma.websiteTemplate.create({
      data: { name, slug, categoryId, description, thumbnailUrl, demoUrl, sourceType, price, featured }
    });
    res.json({ success: true, template });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const template = await prisma.websiteTemplate.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json({ success: true, template });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.websiteTemplate.update({
      where: { id: req.params.id },
      data: { active: false }
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
