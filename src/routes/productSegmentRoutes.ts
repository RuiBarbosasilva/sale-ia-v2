import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { productSegmentService } from '../services/productSegmentService';

const router = Router();
const prisma = new PrismaClient();

// Listar segmentos
router.get('/', async (req: Request, res: Response) => {
  try {
    const segments = await productSegmentService.list();
    return res.json({ success: true, segments });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Criar segmento
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, description, color, icon } = req.body;
    if (!name) return res.status(400).json({ error: 'Nome e obrigatorio' });
    
    const segment = await productSegmentService.create(name, description, color, icon);
    return res.json({ success: true, segment });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Estatisticas de segmentos
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await productSegmentService.getStats();
    return res.json({ success: true, stats });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Produtos por segmento
router.get('/:segmentId/products', async (req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      where: { segmentId: req.params.segmentId, active: true },
      orderBy: { name: 'asc' }
    });
    return res.json({ success: true, products });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});


// Deletar segmento (soft delete - desativa)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.productSegment.update({
      where: { id: req.params.id },
      data: { isActive: false }
    });
    return res.json({ success: true, message: 'Segmento desativado' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Editar segmento
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { name, description, color, icon } = req.body;
    const updated = await prisma.productSegment.update({
      where: { id: req.params.id },
      data: { name, description, color, icon }
    });
    return res.json({ success: true, segment: updated });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;