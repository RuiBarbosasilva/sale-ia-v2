import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.get('/', async (req: Request, res: Response) => {
  try {
    const produtos = await prisma.afiliadoProduto.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(produtos);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { nome, produtoIdExterno, linkAfiliado, categoria, preco, comissaoPercentual, temperatura, tipo, plataforma, status, score } = req.body;
    if (!nome || !linkAfiliado) {
      return res.status(400).json({ error: 'Nome e Vendor Nickname são obrigatórios' });
    }
    const produto = await prisma.afiliadoProduto.create({
      data: {
        nome,
        produtoIdExterno: produtoIdExterno || `${plataforma || 'clickbank'}_${Date.now()}`,
        linkAfiliado,
        categoria: categoria || 'outros',
        preco: preco || 0,
        comissaoPercentual: comissaoPercentual || 50,
        temperatura: temperatura || 0,
        tipo: tipo || 'digital',
        plataforma: plataforma || 'clickbank',
        status: status || 'ativo',
        score: score || 50
      }
    });
    res.status(201).json(produto);
  } catch (error: any) {
    console.error('[Produtos] Erro ao cadastrar:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
