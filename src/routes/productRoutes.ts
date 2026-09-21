import { Router, Request, Response } from 'express';
import { productService } from '../services/productService';
import { adminAuthorization } from '../middlewares/security';

const router = Router();

router.get('/', adminAuthorization, async (req: Request, res: Response) => {
  try {
    const { niche } = req.query;
    const products = await productService.list(niche as string);
    return res.json({ success: true, products });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.get('/niches', adminAuthorization, async (req: Request, res: Response) => {
  try {
    const niches = await productService.getNiches();
    return res.json({ success: true, niches });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.post('/', adminAuthorization, async (req: Request, res: Response) => {
  try {
    const product = await productService.create(req.body);
    return res.json({ success: true, product });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.put('/:id', adminAuthorization, async (req: Request, res: Response) => {
  try {
    const product = await productService.update(req.params.id, req.body);
    return res.json({ success: true, product });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', adminAuthorization, async (req: Request, res: Response) => {
  try {
    await productService.delete(req.params.id);
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;