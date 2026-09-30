import { Request, Response } from 'express';
import { MlAffiliateHunterService } from '../services/affiliate/mlAffiliateHunter.service';

const hunter = new MlAffiliateHunterService();

export const affiliateHunterController = {
  async syncMl(req: Request, res: Response) {
    try {
      const category = (req.body.category || 'CASA').toUpperCase();
      const limit = Number(req.body.limit || 10);
      const result = await hunter.fetchAndSaveTopProducts(category, limit);

      if (result.success) {
        return res.json({
          sucesso: true,
          mensagem: result.savedCount + ' produtos do ML sincronizados!',
          dados: result
        });
      } else {
        return res.status(500).json({ sucesso: false, erro: result.error });
      }
    } catch (error: any) {
      return res.status(500).json({ sucesso: false, erro: error.message });
    }
  },

  async syncAll(req: Request, res: Response) {
    try {
      const limit = Number(req.body.limit || 5);
      const results = await hunter.syncAllCategories(limit);
      const totalSaved = results.reduce((sum: number, r: any) => sum + (r.savedCount || 0), 0);

      return res.json({
        sucesso: true,
        mensagem: totalSaved + ' produtos sincronizados de todas as categorias!',
        dados: results
      });
    } catch (error: any) {
      return res.status(500).json({ sucesso: false, erro: error.message });
    }
  }
};
