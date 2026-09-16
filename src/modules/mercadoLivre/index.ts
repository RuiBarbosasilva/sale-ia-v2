import cookieParser from 'cookie-parser';
// src/modules/mercadoLivre/index.ts

export { MercadoLivreClient } from './api/mercadoLivreClient';
export { OrderSyncService, ShipmentService } from './orders/orderSyncService';
export { handleWebhook } from './notifications/notificationController';
export type { IMarketplaceAdapter, AuthResult, HealthStatus } from './types/mercadoLivre.types';

// Factory para futuros marketplaces
// export class MarketplaceAdapterFactory {
//   static getAdapter(type: MarketplaceType, credentials: any): IMarketplaceAdapter {
//     if (type === 'MERCADOLIVRE') return new MercadoLivreAdapter(credentials);
//     throw new Error('Marketplace not supported yet');
//   }
// }


