/**
 * Interface base para todos os provedores de afiliados (ClickBank, Hotmart, etc.)
 * Isso garante que o núcleo do sistema (controllers, services) não precise saber
 * os detalhes de implementação de cada plataforma.
 */
export interface IAffiliateProvider {
  /**
   * Nome único do provedor (ex: 'clickbank', 'hotmart')
   */
  readonly providerName: string;

  /**
   * Busca e normaliza ofertas do marketplace do provedor
   * @returns Lista de ofertas padronizadas para o nosso modelo 'Offer'
   */
  fetchOffers(criteria?: any): Promise<any[]>;

  /**
   * Gera o link de afiliado rastreável específico da plataforma
   * @param offerId ID da oferta no nosso banco
   * @param affiliateId ID do afiliado no nosso banco
   * @param trackingCode Código único para a rota /go/:code
   * @returns A URL final para onde o usuário será redirecionado
   */
  generateAffiliateLink(offerId: string, affiliateId: string, trackingCode: string): Promise<string>;

  /**
   * Processa o payload bruto do webhook da plataforma
   * Deve retornar os dados normalizados para criação da 'Sale' e 'Commission'
   * @param rawPayload O corpo da requisição do webhook
   * @returns Dados normalizados ou null se o evento for ignorado
   */
  processWebhook(rawPayload: any): Promise<{
    externalId: string;       // ID da transação na plataforma (para idempotência)
    offerExternalId: string;  // ID do produto na plataforma
    affiliateExternalId: string; // ID do afiliado na plataforma
    amount: number;           // Valor total da venda
    commission: number;       // Valor da comissão
    status: 'PENDING' | 'CONFIRMED' | 'REFUNDED' | 'CANCELLED';
    rawPayload: any;
  } | null>;
}
