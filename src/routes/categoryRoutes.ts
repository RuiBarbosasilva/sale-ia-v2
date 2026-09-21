import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { adminAuthorization } from '../middlewares/security';

const router = Router();
const prisma = new PrismaClient();

router.get('/', async (req: Request, res: Response) => {
  try {
    const categories = await prisma.websiteCategory.findMany({
      where: { active: true },
      include: { _count: { select: { templates: true } } },
      orderBy: { name: 'asc' }
    });
    res.json({ success: true, categories });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', adminAuthorization, async (req: Request, res: Response) => {
  try {
    const { name, description, icon } = req.body;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const category = await prisma.websiteCategory.create({
      data: { name, slug, description, icon }
    });
    res.json({ success: true, category });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', adminAuthorization, async (req: Request, res: Response) => {
  try {
    const category = await prisma.websiteCategory.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json({ success: true, category });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', adminAuthorization, async (req: Request, res: Response) => {
  try {
    await prisma.websiteCategory.update({
      where: { id: req.params.id },
      data: { active: false }
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
