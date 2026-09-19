// src/modules/mercadoLivre/controllers/authController.ts
import { Request, Response } from 'express';
import axios from 'axios';
import { prisma } from '../lib/prisma';
import { tokenService } from '../auth/tokenService';
import { oauthStateService } from '../auth/oauthStateService';

const ML_AUTH_URL = 'https://auth.mercadolivre.com.br/authorization';
const ML_TOKEN_URL = 'https://api.mercadolibre.com/oauth/token';
const ML_USER_URL = 'https://api.mercadolibre.com/users/me';

function redirectError(res: Response, code: string) {
  return res.redirect(`/dashboard/mercadolivre?status=error&message=${encodeURIComponent(code)}`);
}

export const connect = (req: Request, res: Response) => {
  try {
    const appId = (process.env.MERCADO_LIVRE_APP_ID || '').trim();
    const redirectUri = (process.env.MERCADO_LIVRE_REDIRECT_URI || '').trim();
    if (!appId || !redirectUri) {
      return res.status(500).json({
        success: false,
        error: 'MERCADO_LIVRE_OAUTH_NOT_CONFIGURED',
        requestId: (req as any).requestId,
      });
    }

    const state = oauthStateService.generateState();
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: appId,
      redirect_uri: redirectUri,
      state,
    });

    return res.redirect(`${ML_AUTH_URL}?${params.toString()}`);
  } catch {
    return res.status(500).json({
      success: false,
      error: 'MERCADO_LIVRE_OAUTH_INIT_FAILED',
      requestId: (req as any).requestId,
    });
  }
};

export const callback = async (req: Request, res: Response) => {
  const { code, state } = req.query;

  if (
    typeof state !== 'string' ||
    state.length < 32 ||
    state.length > 128 ||
    !/^[a-f0-9]+$/i.test(state) ||
    !oauthStateService.validateAndConsumeState(state)
  ) {
    return redirectError(res, 'MERCADO_LIVRE_OAUTH_INVALID_STATE');
  }

  if (typeof code !== 'string' || code.length < 8 || code.length > 4096) {
    return redirectError(res, 'MERCADO_LIVRE_OAUTH_INVALID_CODE');
  }

  const appId = (process.env.MERCADO_LIVRE_APP_ID || '').trim();
  const clientSecret = (process.env.MERCADO_LIVRE_CLIENT_SECRET || '').trim();
  const redirectUri = (process.env.MERCADO_LIVRE_REDIRECT_URI || '').trim();

  if (!appId || !clientSecret || !redirectUri) {
    return redirectError(res, 'MERCADO_LIVRE_OAUTH_NOT_CONFIGURED');
  }

  try {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: appId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    });

    const tokenResponse = await axios.post(ML_TOKEN_URL, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      timeout: 15000,
      validateStatus: status => status >= 200 && status < 300,
    });

    const accessToken = tokenResponse.data?.access_token;
    const userResponse = await axios.get(ML_USER_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
      timeout: 15000,
      validateStatus: status => status >= 200 && status < 300,
    });

    const userData = userResponse.data;
    if (!userData?.id || typeof userData.id !== 'number') {
      throw new Error('MERCADO_LIVRE_USER_INVALID');
    }

    const account = await prisma.mercadoLivreAccount.upsert({
      where: { mlUserId: String(userData.id) },
      update: {
        nickname: typeof userData.nickname === 'string' ? userData.nickname.slice(0, 120) : null,
        isActive: true,
      },
      create: {
        userId: (req as any).user?.id || 'SYSTEM',
        mlUserId: String(userData.id),
        nickname: typeof userData.nickname === 'string' ? userData.nickname.slice(0, 120) : null,
        siteId: typeof userData.site_id === 'string' ? userData.site_id.slice(0, 20) : 'MLB',
        permalink: typeof userData.permalink === 'string' ? userData.permalink.slice(0, 500) : null,
        isActive: true,
      },
    });

    await tokenService.saveInitialTokens(account.id, tokenResponse.data);

    return res.redirect('/dashboard/mercadolivre?status=success');
  } catch (error) {
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;
    console.warn('[ML OAuth] callback failed', {
      requestId: (req as any).requestId,
      providerStatus: status || 'unknown',
    });
    return redirectError(res, 'MERCADO_LIVRE_OAUTH_FAILED');
  }
};

export const disconnect = async (req: Request, res: Response) => {
  try {
    const accountId = req.params.accountId;
    if (!/^[A-Za-z0-9_-]{10,100}$/.test(accountId)) {
      return res.status(400).json({ success: false, error: 'INVALID_ACCOUNT_ID', requestId: (req as any).requestId });
    }

    const result = await prisma.mercadoLivreAccount.updateMany({
      where: { id: accountId, isActive: true },
      data: { isActive: false },
    });

    if (result.count === 0) {
      return res.status(404).json({ success: false, error: 'MERCADO_LIVRE_ACCOUNT_NOT_FOUND', requestId: (req as any).requestId });
    }

    return res.json({ success: true, message: 'MERCADO_LIVRE_ACCOUNT_DISCONNECTED' });
  } catch {
    return res.status(500).json({ success: false, error: 'MERCADO_LIVRE_DISCONNECT_FAILED', requestId: (req as any).requestId });
  }
};
