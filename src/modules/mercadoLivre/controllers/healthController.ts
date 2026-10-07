// src/modules/mercadoLivre/controllers/healthController.ts
import { Request, Response } from 'express';
import axios from 'axios';
import { prisma } from '../lib/prisma';
import { tokenService } from '../auth/tokenService';

export const healthCheck = async (_req: Request, res: Response) => {
  try {
    console.log('[ML Health] 🟢 Iniciando health check...');
    
    // 1. Buscar conta ativa
    const account = await prisma.mercadoLivreAccount.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    });

    if (!account) {
      console.log('[ML Health] ⚠️ Nenhuma conta ativa');
      return res.json({
        apiReachable: false,
        authenticationValid: false,
        tokenExpiresAt: null,
        lastSync: null,
        rateLimitState: 'OK',
        message: 'Nenhuma conta Mercado Livre conectada'
      });
    }

    console.log('[ML Health] ✅ Conta encontrada:', account.nickname);

    // 2. Buscar token válido
    let accessToken: string | null = null;
    let tokenExpiresAt: Date | null = null;
    
    try {
      accessToken = await tokenService.getValidToken(account.id);
      
      // Buscar expiração do token
      const tokenRecord = await prisma.mercadoLivreToken.findFirst({
        where: { accountId: account.id },
        orderBy: { updatedAt: 'desc' },
        select: { expiresAt: true }
      });
      
      tokenExpiresAt = tokenRecord?.expiresAt || null;
    } catch (error: unknown) {
      console.error('[ML Health] ❌ Erro ao obter token:', error instanceof Error ? error.message : 'UNKNOWN_ERROR');
      return res.json({
        apiReachable: false,
        authenticationValid: false,
        tokenExpiresAt: null,
        lastSync: null,
        rateLimitState: 'OK',
        message: 'Falha ao obter token de autenticação'
      });
    }

    // 3. Testar API do Mercado Livre com autenticação
    let apiReachable = false;
    let authenticationValid = false;
    let rateLimitState: 'OK' | 'LIMITED' = 'OK';
    
    try {
      const userResponse = await axios.get('https://api.mercadolibre.com/users/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
        timeout: 10000
      });
      
      if (userResponse.status === 200 && userResponse.data?.id) {
        apiReachable = true;
        authenticationValid = true;
        console.log('[ML Health] ✅ API acessível e token válido');
      }
    } catch (error: unknown) {
      console.error('[ML Health] ❌ Erro ao chamar /users/me:', error instanceof Error ? error.message : 'UNKNOWN_ERROR');
      
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        apiReachable = true;
        authenticationValid = false;
      } else if (axios.isAxiosError(error) && error.response?.status === 429) {
        apiReachable = true;
        authenticationValid = true;
        rateLimitState = 'LIMITED';
      } else if (axios.isAxiosError(error) && ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN'].includes(error.code || '')) {
        apiReachable = false;
        authenticationValid = false;
      } else {
        apiReachable = true;
        authenticationValid = false;
      }
    }

    // 4. Buscar a sincronização mais recente entre pedidos e anúncios
    const [lastOrderSync, lastItemSync] = await Promise.all([
      prisma.mercadoLivreOrder.findFirst({
        orderBy: { lastSyncedAt: 'desc' },
        select: { lastSyncedAt: true }
      }),
      prisma.mercadoLivreItem.findFirst({
        orderBy: { lastSyncedAt: 'desc' },
        select: { lastSyncedAt: true }
      })
    ]);
    const lastSync = [lastOrderSync?.lastSyncedAt, lastItemSync?.lastSyncedAt].reduce<Date | null>(
      (latest, date) => (!date || (latest && latest.getTime() >= date.getTime()) ? latest : date),
      null
    );

    // 5. Retornar health check completo
    res.json({
      apiReachable,
      authenticationValid,
      tokenExpiresAt,
      lastSync,
      rateLimitState,
      account: {
        id: account.id,
        nickname: account.nickname,
        mlUserId: account.mlUserId,
        isActive: account.isActive
      }
    });
  } catch (error: unknown) {
    console.error('[ML Health] ❌ Erro crítico:', error instanceof Error ? error.message : 'UNKNOWN_ERROR');
    res.status(500).json({
      error: 'MERCADO_LIVRE_HEALTH_CHECK_FAILED',
      message: 'Erro ao verificar a saúde do Mercado Livre'
    });
  }
};
