
﻿// src/modules/mercadoLivre/controllers/itemsController.ts
import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { mercadoLivreSyncService } from '../services/mercadoLivreSyncService';

function boundedInt(value: unknown, fallback: number, min: number, max: number) {
  if (value === undefined) return fallback;
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) throw new Error('INVALID_PAGINATION');
  return n;
}

export const listItems = async (req: Request, res: Response) => {
  try {
    const account = await prisma.mercadoLivreAccount.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    });
    if (!account) return res.status(404).json({ success: false, error: 'MERCADO_LIVRE_ACCOUNT_NOT_FOUND' });

    const limit = boundedInt(req.query.limit, 50, 1, 100);
    const offset = boundedInt(req.query.offset, 0, 0, 100000);
    const result = await mercadoLivreSyncService.listItems(account.id, limit, offset);

    return res.json({
      success: true,
      account: { id: account.id, nickname: account.nickname, mlUserId: account.mlUserId },
      ...result
    });
  } catch (error) {
    const code = error instanceof Error && error.message === 'INVALID_PAGINATION'
      ? 'INVALID_PAGINATION' : 'MERCADO_LIVRE_ITEMS_ERROR';
    return res.status(code === 'INVALID_PAGINATION' ? 400 : 500).json({ success: false, error: code });
  }
};
