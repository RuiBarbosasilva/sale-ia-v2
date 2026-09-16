// src/modules/mercadoLivre/types/mercadoLivre.types.ts

export type MarketplaceType = 'MERCADOLIVRE' | 'SHOPEE' | 'AMAZON';

export interface IMarketplaceAdapter {
  authenticate(code: string, redirectUri: string): Promise<AuthResult>;
  refreshToken(refreshToken: string): Promise<AuthResult>;
  disconnect(): Promise<void>;
  getAccount(): Promise<any>;
  getProducts(query?: any): Promise<any[]>;
  createListing(data: any): Promise<any>;
  updateListing(itemId: string, data: any): Promise<any>;
  pauseListing(itemId: string): Promise<any>;
  activateListing(itemId: string): Promise<any>;
  getInventory(itemId: string): Promise<{ stock: number; price: number }>;
  updateInventory(itemId: string, stock: number, price?: number): Promise<any>;
  getOrders(filters?: any): Promise<any[]>;
  getOrder(orderId: string): Promise<any>;
  getShipments(orderId: string): Promise<any[]>;
  getShipmentLabel(shipmentId: string): Promise<{ url: string; format: string }>;
  healthCheck(): Promise<HealthStatus>;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  userId: string;
  nickname: string;
}

export interface HealthStatus {
  apiReachable: boolean;
  authenticationValid: boolean;
  tokenExpiresAt: Date | null;
  lastSync: Date | null;
  rateLimitState: 'OK' | 'WARNING' | 'EXHAUSTED';
}
