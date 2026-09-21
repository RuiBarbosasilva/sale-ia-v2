import { Router, Request, Response } from 'express';
import { creativeGeneratorService } from '../services/creativeGeneratorService';
import { adminAuthorization } from '../middlewares/security';

const router = Router();

// Gerar criativo unico
router.post('/generate', adminAuthorization, async (req: Request, res: Response) => {
  try {
    const { productName, segment, targetAudience, tone } = req.body;
    
    if (!productName || !segment || !targetAudience) {
      return res.status(400).json({ error: 'productName, segment e targetAudience sao obrigatorios' });
    }

    const creative = await creativeGeneratorService.generateCreative({
      productName,
      segment,
      targetAudience,
      tone
    });

    return res.json({ success: true, creative });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Gerar criativos em lote
router.post('/generate-batch', adminAuthorization, async (req: Request, res: Response) => {
  try {
    const { products, targetAudience } = req.body;
    
    if (!products || !Array.isArray(products) || !targetAudience) {
      return res.status(400).json({ error: 'products (array) e targetAudience sao obrigatorios' });
    }

    const creatives = await creativeGeneratorService.generateBatchCreatives(products, targetAudience);

    return res.json({ success: true, count: creatives.length, creatives });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;