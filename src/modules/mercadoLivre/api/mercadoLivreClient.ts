// src/modules/mercadoLivre/api/mercadoLivreClient.ts
import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

const BASE_URL = process.env.MERCADOLIVRE_API_BASE_URL || 'https://api.mercadolibre.com';

export class MercadoLivreClient {
  private client: AxiosInstance;
  private accessToken: string;
  private refreshTokenFn: () => Promise<string>;

  constructor(accessToken: string, refreshTokenFn: () => Promise<string>) {
    this.accessToken = accessToken;
    this.refreshTokenFn = refreshTokenFn;
    
    this.client = axios.create({
      baseURL: BASE_URL,
      timeout: 10000,
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    this.client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
      config.headers.Authorization = `Bearer ${this.accessToken}`;
      return config;
    });

    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean; _rateLimitRetryCount?: number }) | undefined;

        if (!originalRequest) {
          throw error;
        }

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          try {
            const newAccessToken = await this.refreshTokenFn();
            this.accessToken = newAccessToken;
            originalRequest.headers.Authorization = `Bearer ${this.accessToken}`;
            return this.client(originalRequest);
          } catch (refreshError) {
            throw new Error('MERCADO_LIVRE_AUTH_REFRESH_FAILED');
          }
        }

        if (error.response?.status === 429) {
          const retryCount = originalRequest._rateLimitRetryCount ?? 0;
          if (retryCount >= 3) throw new Error('MERCADO_LIVRE_RATE_LIMIT_RETRIES_EXCEEDED');
          originalRequest._rateLimitRetryCount = retryCount + 1;
          const retryAfterHeader = error.response.headers['retry-after'];
          const retryAfterSeconds = Number(retryAfterHeader);
          const delayMs = Number.isFinite(retryAfterSeconds) && retryAfterSeconds >= 0
            ? Math.min(retryAfterSeconds * 1000, 30000)
            : 5000;
          await new Promise(resolve => setTimeout(resolve, delayMs));
          return this.client(originalRequest);
        }

        throw error;
      }
    );
  }

  async get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
    const response = await this.client.get<T>(url, { params });
    return response.data;
  }

  async post<T>(url: string, data?: any, headers?: any): Promise<T> {
    const response = await this.client.post<T>(url, data, { headers });
    return response.data;
  }

  async put<T>(url: string, data?: any): Promise<T> {
    const response = await this.client.put<T>(url, data);
    return response.data;
  }

  async getShipment<T>(shipmentId: string): Promise<T> {
    const response = await this.client.get<T>(`/shipments/${encodeURIComponent(shipmentId)}`, {
      headers: { 'x-format-new': 'true' }
    });
    return response.data;
  }
}

