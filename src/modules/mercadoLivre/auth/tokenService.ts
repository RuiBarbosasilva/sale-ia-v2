// src/modules/mercadoLivre/auth/tokenService.ts
// ⚠️ ATENÇÃO: Substitua o import abaixo pelo caminho real do seu arquivo Prisma no projeto!
// Exemplos comuns: '@/prisma/client', '../../../prisma/client', '../../database/prisma'
import { encrypt, decrypt } from '../security/secretStorageService';
import axios from 'axios';
import { prisma } from '../lib/prisma';
export class TokenService {
  private clientId = (process.env.MERCADO_LIVRE_APP_ID || '').trim();
  private clientSecret = (process.env.MERCADO_LIVRE_CLIENT_SECRET || '').trim();

  async getValidToken(accountId: string): Promise<string> {
    const tokenRecord = await prisma.mercadoLivreToken.findFirst({
      where: { accountId },
      orderBy: { updatedAt: 'desc' }
    });

    if (!tokenRecord) {
      throw new Error('MERCADO_LIVRE_AUTH_REQUIRED');
    }

    const fiveMinutes = 5 * 60 * 1000;
    if (tokenRecord.expiresAt.getTime() - Date.now() < fiveMinutes) {
      return await this.refreshToken(accountId, tokenRecord.refreshToken);
    }

    return decrypt(tokenRecord.accessToken);
  }

  async refreshToken(accountId: string, encryptedRefreshToken: string): Promise<string> {
    const refreshToken = decrypt(encryptedRefreshToken);

    const response = await axios.post('https://api.mercadolibre.com/oauth/token', {
      grant_type: 'refresh_token',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      refresh_token: refreshToken,
    });

    const { access_token, refresh_token, expires_in } = response.data;

    await prisma.mercadoLivreToken.updateMany({
      where: { accountId },
      data: {
        accessToken: encrypt(access_token),
        refreshToken: encrypt(refresh_token),
        expiresAt: new Date(Date.now() + expires_in * 1000),
      }
    });

    return access_token;
  }

  async saveInitialTokens(accountId: string, tokens: any) {
    await prisma.mercadoLivreToken.create({
      data: {
        accountId,
        accessToken: encrypt(tokens.access_token),
        refreshToken: encrypt(tokens.refresh_token),
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        scope: tokens.scope || 'offline_access read write',
      }
    });
  }
}

export const tokenService = new TokenService();




