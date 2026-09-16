// src/modules/mercadoLivre/controllers/accountController.ts
import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import axios from 'axios';
import { tokenService } from '../auth/tokenService';

export const getAccount = async (req: Request, res: Response) => {
  try {
    console.log('[ML Account] 🟢 Buscando conta conectada...');
    
    // Buscar a primeira conta ativa (não exige autenticação interna do Sale-IA)
    const account = await prisma.mercadoLivreAccount.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    });

    if (!account) {
      console.log('[ML Account] ⚠️ Nenhuma conta ativa encontrada');
      return res.status(404).json({ 
        connected: false, 
        message: 'Nenhuma conta Mercado Livre conectada' 
      });
    }

    console.log('[ML Account] ✅ Conta encontrada:', account.nickname);

    // Buscar dados atualizados do Mercado Livre via /users/me
    const accessToken = await tokenService.getValidToken(account.id);
    
    const userResponse = await axios.get('https://api.mercadolibre.com/users/me', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const mlUser = userResponse.data;

    // Retornar dados da conta SEM expor tokens
    res.json({
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
  } catch (error: any) {
    console.error('[ML Account] ❌ Erro ao buscar conta:', error.message);
    res.status(500).json({ 
      error: 'MERCADO_LIVRE_ACCOUNT_ERROR',
      message: error.message 
    });
  }
};
