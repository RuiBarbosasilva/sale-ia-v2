// src/modules/mercadoLivre/controllers/listingController.ts
import { Request, Response } from 'express';
import { listingService } from '../services/listingService';
import { prisma } from '../lib/prisma';

const MAX_LIMIT = 100;
const MAX_OFFSET = 100000;

function parseBoundedInt(value: unknown, fallback: number, min: number, max: number) {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) throw new Error('INVALID_PAGINATION');
  return parsed;
}

function safeMessage(error: unknown) {
  const message = error instanceof Error ? error.message : '';
  return /^[A-Z0-9_.-]{1,80}$/.test(message) ? message : 'MERCADO_LIVRE_INTERNAL_ERROR';
}

function validateItemId(id: unknown) {
  if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{3,80}$/.test(id)) throw new Error('INVALID_MERCADO_LIVRE_ITEM_ID');
  return id;
}

export const getListings = async (req: Request, res: Response) => {
  try {
    const account = await prisma.mercadoLivreAccount.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'desc' } });
    if (!account) return res.status(404).json({ success: false, message: 'MERCADO_LIVRE_ACCOUNT_NOT_FOUND' });

    const limit = parseBoundedInt(req.query.limit, 50, 1, MAX_LIMIT);
    const offset = parseBoundedInt(req.query.offset, 0, 0, MAX_OFFSET);
    const data = await listingService.getListings(account.id, limit, offset);
    res.json(data);
  } catch (error) {
    const code = safeMessage(error);
    res.status(code === 'INVALID_PAGINATION' ? 400 : 500).json({ error: code });
  }
};

export const getItem = async (req: Request, res: Response) => {
  try {
    const id = validateItemId(req.params.id);
    const accountId = (req.query.accountId as string) || (req as any).user?.accountId;
    const account = accountId
      ? await prisma.mercadoLivreAccount.findUnique({ where: { id: accountId, isActive: true } })
      : await prisma.mercadoLivreAccount.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'desc' } });
    if (!account) return res.status(404).json({ error: 'MERCADO_LIVRE_ACCOUNT_NOT_FOUND' });
    const data = await listingService.getItem(account.id, id);
    res.json(data);
  } catch (error) {
    const code = safeMessage(error);
    res.status(code === 'INVALID_MERCADO_LIVRE_ITEM_ID' ? 400 : 500).json({ error: code });
  }
};

export const createListing = async (req: Request, res: Response) => {
  try {
    const accountId = req.body.accountId || (req as any).user?.accountId || (await prisma.mercadoLivreAccount.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'desc' } }))?.id;
    if (!accountId) return res.status(404).json({ error: 'MERCADO_LIVRE_ACCOUNT_NOT_FOUND' });
    const { accountId: _accountId, ...listingData } = req.body;
    const data = await listingService.createListing(accountId, listingData);
    res.status(201).json(data);
  } catch (error) {
    res.status(400).json({ error: safeMessage(error) });
  }
};

export const updateListing = async (req: Request, res: Response) => {
  try {
    const id = validateItemId(req.params.id);
    const accountId = req.body.accountId || (req as any).user?.accountId || (await prisma.mercadoLivreAccount.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'desc' } }))?.id;
    if (!accountId) return res.status(404).json({ error: 'MERCADO_LIVRE_ACCOUNT_NOT_FOUND' });
    const { accountId: _accountId, ...updateData } = req.body;
    const data = await listingService.updateListing(accountId, id, updateData);
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: safeMessage(error) });
  }
};

export const pauseListing = async (req: Request, res: Response) => {
  try {
    const id = validateItemId(req.params.id);
    const accountId = req.body.accountId || (req as any).user?.accountId || (await prisma.mercadoLivreAccount.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'desc' } }))?.id;
    if (!accountId) return res.status(404).json({ error: 'MERCADO_LIVRE_ACCOUNT_NOT_FOUND' });
    const data = await listingService.changeStatus(accountId, id, 'paused');
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: safeMessage(error) });
  }
};

export const activateListing = async (req: Request, res: Response) => {
  try {
    const id = validateItemId(req.params.id);
    const accountId = req.body.accountId || (req as any).user?.accountId || (await prisma.mercadoLivreAccount.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'desc' } }))?.id;
    if (!accountId) return res.status(404).json({ error: 'MERCADO_LIVRE_ACCOUNT_NOT_FOUND' });
    const data = await listingService.changeStatus(accountId, id, 'active');
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: safeMessage(error) });
  }
};

