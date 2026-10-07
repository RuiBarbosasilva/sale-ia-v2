// src/modules/mercadoLivre/auth/tokenService.ts
import { encrypt, decrypt } from '../security/secretStorageService';
import axios from 'axios';
import { prisma } from '../lib/prisma';

export class TokenService {
  private clientId = (process.env.MERCADO_LIVRE_APP_ID || '').trim();
  private clientSecret = (process.env.MERCADO_LIVRE_CLIENT_SECRET || '').trim();
  private refreshInFlight = new Map<string, Promise<string>>();

  async getValidToken(accountId: string): Promise<string> {
    const tokenRecord = await prisma.mercadoLivreToken.findFirst({
      where: { accountId },
      orderBy: { updatedAt: 'desc' }
    });

    if (!tokenRecord) throw new Error('MERCADO_LIVRE_AUTH_REQUIRED');

    const fiveMinutes = 5 * 60 * 1000;
    if (tokenRecord.expiresAt.getTime() - Date.now() < fiveMinutes) {
      return this.refreshTokenCoalesced(accountId);
    }

    return decrypt(tokenRecord.accessToken);
  }

  private async refreshTokenCoalesced(accountId: string): Promise<string> {
    const existing = this.refreshInFlight.get(accountId);
    if (existing) return existing;

    const promise = this.refreshTokenFromStoredRecord(accountId).finally(() => {
      this.refreshInFlight.delete(accountId);
    });
    this.refreshInFlight.set(accountId, promise);
    return promise;
  }

  private async refreshTokenFromStoredRecord(accountId: string): Promise<string> {
    const tokenRecord = await prisma.mercadoLivreToken.findFirst({
      where: { accountId },
      orderBy: { updatedAt: 'desc' }
    });
    if (!tokenRecord) throw new Error('MERCADO_LIVRE_AUTH_REQUIRED');

    const fiveMinutes = 5 * 60 * 1000;
    if (tokenRecord.expiresAt.getTime() - Date.now() >= fiveMinutes) {
      return decrypt(tokenRecord.accessToken);
    }

    return this.refreshToken(accountId, tokenRecord.refreshToken);
  }

  async refreshToken(accountId: string, encryptedRefreshToken: string): Promise<string> {
    if (!this.clientId || !this.clientSecret) throw new Error('MERCADO_LIVRE_OAUTH_NOT_CONFIGURED');

    const refreshToken = decrypt(encryptedRefreshToken);

    const response = await axios.post('https://api.mercadolibre.com/oauth/token', {
      grant_type: 'refresh_token',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      refresh_token: refreshToken,
    }, {
      timeout: 15000,
      validateStatus: status => status >= 200 && status < 300,
    });

    const { access_token, refresh_token, expires_in } = response.data || {};
    if (
      typeof access_token !== 'string' ||
      typeof refresh_token !== 'string' ||
      !Number.isFinite(Number(expires_in)) ||
      Number(expires_in) <= 0
    ) {
      throw new Error('MERCADO_LIVRE_INVALID_TOKEN_RESPONSE');
    }

    const updated = await prisma.mercadoLivreToken.updateMany({
      where: { accountId },
      data: {
        accessToken: encrypt(access_token),
        refreshToken: encrypt(refresh_token),
        expiresAt: new Date(Date.now() + Number(expires_in) * 1000),
      }
    });

    if (updated.count === 0) throw new Error('MERCADO_LIVRE_TOKEN_NOT_FOUND');

    return access_token;
  }

  async saveInitialTokens(accountId: string, tokens: any) {
    if (
      typeof tokens?.access_token !== 'string' ||
      typeof tokens?.refresh_token !== 'string' ||
      !Number.isFinite(Number(tokens?.expires_in)) ||
      Number(tokens.expires_in) <= 0
    ) {
      throw new Error('MERCADO_LIVRE_INVALID_INITIAL_TOKEN');
    }

    await prisma.mercadoLivreToken.create({
      data: {
        accountId,
        accessToken: encrypt(tokens.access_token),
        refreshToken: encrypt(tokens.refresh_token),
        expiresAt: new Date(Date.now() + Number(tokens.expires_in) * 1000),
        scope: typeof tokens.scope === 'string' ? tokens.scope.slice(0, 500) : 'offline_access read write',
      }
    });
  }
}

export const tokenService = new TokenService();
