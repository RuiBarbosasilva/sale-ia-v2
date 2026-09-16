import { Router, Request, Response } from 'express';
import { prospectingService } from '../services/prospectingService';

const router = Router();

// Buscar empresas
router.get('/', async (req: Request, res: Response) => {
  try {
    const { segment, city, state, category, status, minScore, page, limit } = req.query;
    const result = await prospectingService.searchBusinesses(
      {
        segment: segment as string,
        city: city as string,
        state: state as string,
        category: category as string,
        status: status as string,
        minScore: minScore ? parseInt(minScore as string) : undefined
      },
      parseInt(page as string) || 1,
      parseInt(limit as string) || 20
    );
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Criar empresa
router.post('/', async (req: Request, res: Response) => {
  try {
    const result = await prospectingService.createBusiness(req.body);
    if (!result.success) {
      return res.status(409).json(result);
    }
    res.status(201).json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Atualizar empresa
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const result = await prospectingService.updateBusiness(req.params.id, req.body);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Deletar empresa
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const result = await prospectingService.deleteBusiness(req.params.id);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Estatísticas
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await prospectingService.getStats();
    res.json({ success: true, stats });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Exportar CSV
router.get('/export', async (req: Request, res: Response) => {
  try {
    const { segment, city, state } = req.query;
    const csv = await prospectingService.exportToCSV({
      segment: segment as string,
      city: city as string,
      state: state as string
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=empresas.csv');
    res.send(csv);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;