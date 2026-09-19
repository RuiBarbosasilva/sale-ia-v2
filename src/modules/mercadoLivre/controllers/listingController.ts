// src/modules/mercadoLivre/controllers/listingController.ts
import { Request, Response } from 'express';
import { listingService } from '../services/listingService';
import { prisma } from '../lib/prisma';

export const getListings = async (req: Request, res: Response) => {
  try {
    const account = await prisma.mercadoLivreAccount.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'desc' } });

    if (!account) {
      return res.status(404).json({ success: false, message: 'Nenhuma conta Mercado Livre ativa encontrada' });
    }
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    
    const data = await listingService.getListings(account.id, limit, offset);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const accountId = (req.query.accountId as string) || (req as any).user?.accountId;
    const account = accountId ? await prisma.mercadoLivreAccount.findUnique({ where: { id: accountId, isActive: true } }) : await prisma.mercadoLivreAccount.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'desc' } });
    if (!account) return res.status(404).json({ error: 'MERCADO_LIVRE_ACCOUNT_NOT_FOUND' });
    const data = await listingService.getItem(account.id, id);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createListing = async (req: Request, res: Response) => {
  try {
    const accountId = req.body.accountId || (req as any).user?.accountId || (await prisma.mercadoLivreAccount.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'desc' } }))?.id;
    if (!accountId) return res.status(404).json({ error: 'MERCADO_LIVRE_ACCOUNT_NOT_FOUND' });
    const { accountId: _accountId, ...listingData } = req.body;
    const data = await listingService.createListing(accountId, listingData);
    res.status(201).json(data);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const updateListing = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const accountId = req.body.accountId || (req as any).user?.accountId || (await prisma.mercadoLivreAccount.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'desc' } }))?.id;
    if (!accountId) return res.status(404).json({ error: 'MERCADO_LIVRE_ACCOUNT_NOT_FOUND' });
    const { accountId: _accountId, ...updateData } = req.body;
    const data = await listingService.updateListing(accountId, id, updateData);
    res.json(data);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const pauseListing = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const accountId = req.body.accountId || (req as any).user?.accountId || (await prisma.mercadoLivreAccount.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'desc' } }))?.id;
    if (!accountId) return res.status(404).json({ error: 'MERCADO_LIVRE_ACCOUNT_NOT_FOUND' });
    const data = await listingService.changeStatus(accountId, id, 'paused');
    res.json(data);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const activateListing = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const accountId = req.body.accountId || (req as any).user?.accountId || (await prisma.mercadoLivreAccount.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'desc' } }))?.id;
    if (!accountId) return res.status(404).json({ error: 'MERCADO_LIVRE_ACCOUNT_NOT_FOUND' });
    const data = await listingService.changeStatus(accountId, id, 'active');
    res.json(data);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};



