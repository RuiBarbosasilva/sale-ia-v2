// src/modules/mercadoLivre/services/orderService.ts
// ⚠️ ATENÇÃO: Ajuste o caminho do Prisma aqui também
import { MercadoLivreClient } from '../api/mercadoLivreClient';
import { tokenService } from '../auth/tokenService';
import { prisma } from '../lib/prisma';
export class OrderService {
  async syncOrder(mlOrderId: string, accountId: string) {
    const accessToken = await tokenService.getValidToken(accountId);
    
    // CORREÇÃO: A função de refresh agora retorna Promise<string>, alinhado com o Client
    const client = new MercadoLivreClient(accessToken, () => tokenService.refreshToken(accountId, 'placeholder'));

    try {
      const orderData = await client.get<any>(`/orders/${mlOrderId}`);

      await prisma.mercadoLivreOrder.upsert({
        where: { mlOrderId: String(orderData.id) },
        update: {
          status: orderData.status,
          totalAmount: orderData.total_amount,
          lastSyncedAt: new Date(),
        },
        create: {
          accountId,
          mlOrderId: String(orderData.id),
          status: orderData.status,
          totalAmount: orderData.total_amount,
          dateCreated: new Date(orderData.date_created),
        }
      });

      return orderData;
    } catch (error) {
      throw new Error(`MERCADO_LIVRE_API_ERROR: Falha ao sincronizar order ${mlOrderId}`);
    }
  }
}
export const orderService = new OrderService();



