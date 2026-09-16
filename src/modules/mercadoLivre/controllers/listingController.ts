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
    const accountId = req.query.accountId as string;
    const data = await listingService.getItem(accountId, id);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createListing = async (req: Request, res: Response) => {
  try {
    const accountId = req.body.accountId || (req as any).user?.accountId;
    const data = await listingService.createListing(accountId, req.body);
    res.status(201).json(data);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const updateListing = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const accountId = req.body.accountId || (req as any).user?.accountId;
    const data = await listingService.updateListing(accountId, id, req.body);
    res.json(data);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const pauseListing = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const accountId = req.body.accountId || (req as any).user?.accountId;
    const data = await listingService.changeStatus(accountId, id, 'paused');
    res.json(data);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};

export const activateListing = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const accountId = req.body.accountId || (req as any).user?.accountId;
    const data = await listingService.changeStatus(accountId, id, 'active');
    res.json(data);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};



