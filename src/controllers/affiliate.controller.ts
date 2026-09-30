import { Request, Response } from 'express';
import { MlAffiliateService } from '../services/affiliate/mlAffiliate.service';

const mlService = new MlAffiliateService();

export const affiliateController = {
  async addFromUrls(req: Request, res: Response) {
    try {
      const { urls } = req.body;
      if (!urls || !Array.isArray(urls) || urls.length === 0) {
        return res.status(400).json({ sucesso: false, erro: 'Envie um array de URLs no body' });
      }

      const results = await mlService.addProductsFromUrls(urls);
      const successCount = results.filter(r => r.success).length;

      return res.json({
        sucesso: true,
        mensagem: `${successCount} de ${urls.length} produtos processados com sucesso!`,
        dados: results
      });
    } catch (error: any) {
      return res.status(500).json({ sucesso: false, erro: error.message });
    }
  }
};
