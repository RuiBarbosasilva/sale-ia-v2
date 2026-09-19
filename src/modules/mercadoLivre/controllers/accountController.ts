
﻿// src/modules/mercadoLivre/controllers/accountController.ts
import { Request, Response } from 'express';
import axios from 'axios';
import { prisma } from '../lib/prisma';
import { tokenService } from '../auth/tokenService';

export const getAccount = async (req: Request, res: Response) => {
  try {
    const account = await prisma.mercadoLivreAccount.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    });

    if (!account) {
      return res.status(404).json({ connected: false, error: 'MERCADO_LIVRE_ACCOUNT_NOT_FOUND' });
    }

    const accessToken = await tokenService.getValidToken(account.id);
    const userResponse = await axios.get('https://api.mercadolivre.com/users/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
      timeout: 15000,
    });
    const mlUser = userResponse.data;

    return res.json({
      connected: true,
      account: {
        id: account.id,
        mlUserId: account.mlUserId,
        nickname: account.nickname,
        siteId: account.siteId,
        permalink: account.permalink,
        isActive: account.isActive,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt
      },
      mlUser: {
        id: mlUser.id,
        nickname: mlUser.nickname,
        first_name: mlUser.first_name,
        last_name: mlUser.last_name,
        email: mlUser.email,
        site_id: mlUser.site_id,
        permalink: mlUser.permalink,
        seller_reputation: mlUser.seller_reputation?.level_id || null
      }
    });
  } catch (error) {
    console.error('[ML Account] Falha ao buscar conta', { requestId: (req as any).requestId });
    return res.status(500).json({ error: 'MERCADO_LIVRE_ACCOUNT_ERROR', requestId: (req as any).requestId });
  }
};
