import { Request, Response } from 'express';
import { PinterestPublisherService } from '../services/publishers/pinterestPublisher.service';

const pinterestService = new PinterestPublisherService();

export const publisherController = {
  async listBoards(req: Request, res: Response) {
    try {
      const boards = await pinterestService.getUserBoards();
      return res.json({ sucesso: true, dados: boards });
    } catch (error: any) {
      return res.status(500).json({ sucesso: false, erro: error.message });
    }
  },

  async createPin(req: Request, res: Response) {
    try {
      const { boardId, title, description, link, imageUrl } = req.body;
      if (!boardId || !title || !link) {
        return res.status(400).json({ sucesso: false, erro: 'boardId, title e link são obrigatórios' });
      }
      
      const finalImageUrl = imageUrl || 'https://images.unsplash.com/photo-1585659722983-3a675dabf23d?w=800&q=80';
      
      const result = await pinterestService.createPin(boardId, title, description, link, finalImageUrl);
      return res.json({ sucesso: true, mensagem: 'Pin publicado com sucesso!', dados: result });
    } catch (error: any) {
      return res.status(500).json({ sucesso: false, erro: error.message });
    }
  }
};
