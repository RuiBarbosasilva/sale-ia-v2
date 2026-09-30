import { IAffiliateProvider } from '../interfaces/IAffiliateProvider';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class ClickBankProvider implements IAffiliateProvider {
  readonly providerName = 'clickbank';

  private get apiKey() { return process.env.CLICKBANK_API_KEY || ''; }
  private get nickname() { return process.env.CLICKBANK_NICKNAME || ''; }

  // CONFIGURAÇÃO VENCEDORA: Apenas Authorization, SEM o header Accept
  private get authHeaders() {
    return {
      'Authorization': `Bearer ${this.apiKey}`
    };
  }

  async fetchOffers(criteria?: any): Promise<any[]> {
    if (!this.apiKey) {
      console.log('[ClickBank] API Key não configurada.');
      return [];
    }

    try {
      console.log('[ClickBank] Buscando produtos na API...');
      const response = await fetch('https://api.clickbank.com/rest/1.3/products', {
        method: 'GET',
        headers: this.authHeaders
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // A ClickBank pode retornar JSON ou XML. Vamos tentar JSON primeiro.
      const textResponse = await response.text();
      let products: any[] = [];

      try {
        const data = JSON.parse(textResponse);
        products = Array.isArray(data) ? data : (data.products || []);
      } catch (e) {
        console.log('[ClickBank] Resposta não é JSON válido. Pode ser XML ou formato legado.');
        console.log('Primeiros 200 caracteres da resposta:', textResponse.substring(0, 200));
        // Se for XML, precisaríamos de um parser XML, mas vamos assumir JSON por enquanto
        // já que o teste PowerShell funcionou.
        return [];
      }
      
      console.log(`[ClickBank] ✅ ${products.length} produtos encontrados`);
      
      return products.map((product: any) => ({
        externalId: product.productCode || product.id || String(Math.random()),
        name: product.name || product.title || 'Produto sem nome',
        category: product.category || 'general',
        price: product.price || product.initialPrice || 0,
        commissionPercent: product.commissionPercent || product.commission || 50,
        vendor: product.vendor || product.accountNickname || '',
        gravity: product.gravity || 0,
        raw: product
      }));
    } catch (error: any) {
      console.error('[ClickBank] ❌ Erro ao buscar produtos:', error.message);
      return [];
    }
  }

  async generateAffiliateLink(offerId: string, affiliateId: string, trackingCode: string): Promise<string> {
    const produto = await prisma.afiliadoProduto.findUnique({ where: { id: offerId } });
    
    if (!produto) {
      throw new Error('Produto não encontrado para gerar link ClickBank');
    }

    const vendor = produto.linkAfiliado;
    
    if (!this.nickname || !vendor) {
      throw new Error('Nickname do afiliado ou Vendor não configurados');
    }

    const hopLink = `https://${this.nickname}.${vendor}.hop.clickbank.net/?tid=${trackingCode}`;
    return hopLink;
  }

  async processWebhook(rawPayload: any): Promise<{
    externalId: string;
    offerExternalId: string;
    affiliateExternalId: string;
    amount: number;
    commission: number;
    status: 'PENDING' | 'CONFIRMED' | 'REFUNDED' | 'CANCELLED';
    rawPayload: any;
  } | null> {
    const transactionType = rawPayload.transactionType;
    const receipt = rawPayload.receipt;
    const totalAmount = parseFloat(rawPayload.totalAmount) || 0;
    const affiliateCommission = parseFloat(rawPayload.affiliateCommission) || 0;
    const vendor = rawPayload.vendor;
    const affiliate = rawPayload.affiliate;

    if (!receipt || transactionType === 'TEST') {
      return null;
    }

    let status: 'PENDING' | 'CONFIRMED' | 'REFUNDED' | 'CANCELLED' = 'PENDING';
    if (transactionType === 'SALE') status = 'CONFIRMED';
    else if (transactionType === 'REFUND') status = 'REFUNDED';
    else if (transactionType === 'CANCELLATION' || transactionType === 'CHARGEBACK') status = 'CANCELLED';

    return {
      externalId: receipt,
      offerExternalId: vendor,
      affiliateExternalId: affiliate || this.nickname,
      amount: totalAmount,
      commission: affiliateCommission,
      status,
      rawPayload
    };
  }
}

export const clickBankProvider = new ClickBankProvider();
