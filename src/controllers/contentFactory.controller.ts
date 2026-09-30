import { Request, Response } from 'express';
import { ContentGeneratorService } from '../services/contentFactory/contentGenerator.service';

const generator = new ContentGeneratorService();

export const contentFactoryController = {
  async generateOne(req: Request, res: Response) {
    try {
      const { productId } = req.body;
      if (!productId) {
        return res.status(400).json({ sucesso: false, erro: 'productId obrigatorio' });
      }
      const content = await generator.generateContentForProduct(productId);
      return res.json({ sucesso: true, dados: content });
    } catch (error: any) {
      return res.status(500).json({ sucesso: false, erro: error.message });
    }
  },

  async generateLatest(req: Request, res: Response) {
    return res.json({ sucesso: true, mensagem: 'Rota generate-latest funcionando!' });
  }
};
