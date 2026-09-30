import { Request, Response } from 'express';
import { MlSellerService } from '../services/mlSeller/mlSeller.service';

const mlSeller = new MlSellerService();

export const mlSellerController = {
  async createListing(req: Request, res: Response) {
    try {
      const result = await mlSeller.createListing(req.body);
      if (result.success) {
        return res.json({ sucesso: true, mensagem: 'Anúncio criado no ML!', dados: result.data });
      } else {
        return res.status(400).json({ sucesso: false, erro: result.error, detalhes: result.details });
      }
    } catch (error: any) {
      return res.status(500).json({ sucesso: false, erro: error.message });
    }
  }
};
