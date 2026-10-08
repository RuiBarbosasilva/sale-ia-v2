import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

const text = (value: unknown, max = 255): string => {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
};

const numberValue = (value: unknown, fallback = 0): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'UNKNOWN_ERROR';

router.get('/', async (_req: Request, res: Response) => {
  try {
    const produtos = await prisma.afiliadoProduto.findMany({
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    return res.json(produtos);
  } catch (error: unknown) {
    console.error('[Produtos] Erro ao listar:', errorMessage(error));
    return res.status(500).json({
      error: 'AFFILIATE_PRODUCTS_LIST_FAILED',
      message: 'Não foi possível listar os produtos.',
    });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body)
      ? req.body as Record<string, unknown>
      : null;

    if (!body) {
      return res.status(400).json({ error: 'INVALID_PRODUCT_PAYLOAD' });
    }

    const nome = text(body.nome, 200);
    const linkAfiliado = text(body.linkAfiliado, 2048);
    const plataforma = text(body.plataforma, 80) || 'clickbank';
    const produtoIdExterno = text(body.produtoIdExterno, 200) || `${plataforma}_${Date.now()}`;

    if (!nome || !linkAfiliado) {
      return res.status(400).json({ error: 'Nome e link de afiliado são obrigatórios' });
    }

    const produto = await prisma.afiliadoProduto.create({
      data: {
        nome,
        produtoIdExterno,
        linkAfiliado,
        categoria: text(body.categoria, 120) || 'outros',
        preco: Math.max(0, numberValue(body.preco)),
        comissaoPercentual: Math.min(100, Math.max(0, numberValue(body.comissaoPercentual, 50))),
        temperatura: Math.max(0, numberValue(body.temperatura)),
        tipo: text(body.tipo, 80) || 'digital',
        plataforma,
        status: text(body.status, 40) || 'ATIVO',
        score: Math.min(100, Math.max(0, numberValue(body.score, 50))),
      },
    });

    return res.status(201).json(produto);
  } catch (error: unknown) {
    console.error('[Produtos] Erro ao cadastrar:', errorMessage(error));
    return res.status(500).json({
      error: 'AFFILIATE_PRODUCT_CREATE_FAILED',
      message: 'Não foi possível cadastrar o produto.',
    });
  }
});

export default router;
