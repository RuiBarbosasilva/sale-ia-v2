import axios from 'axios';

export class MlSellerService {
  private accessToken = process.env.ML_ACCESS_TOKEN || '';

  async createListing(productData: any) {
    try {
      console.log('[ML Seller] Iniciando criação de anúncio...');
      console.log('[ML Seller] Token presente:', this.accessToken.length > 0 ? 'SIM' : 'NÃO');

      if (!this.accessToken || this.accessToken.length < 20) {
        return { success: false, error: 'Token inválido ou ausente' };
      }

      // Monta payload MÍNIMO e SEGURO
      const payload: any = {
        title: productData.title,
        category_id: productData.category_id || "MLB1055",
        price: Number(productData.price),
        currency_id: "BRL",
        available_quantity: Number(productData.available_quantity || 50),
        buying_mode: "buy_it_now",
        listing_type_id: "gold_pro",
        condition: "new",
        description: {
          plain_text: typeof productData.description === 'string' 
            ? productData.description 
            : (productData.description?.plain_text || "Sem descrição")
        }
      };

      console.log('[ML Seller] Payload montado:', JSON.stringify(payload, null, 2));

      const response = await axios.post('https://api.mercadolibre.com/items', payload, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('[ML Seller] ✅ Sucesso! ID:', response.data.id);
      return { success: true, data: response.data };

    } catch (error: any) {
      console.error('[ML Seller] ❌ Erro:', error.response?.data || error.message);
      return { 
        success: false, 
        error: error.response?.data?.message || error.message,
        details: error.response?.data 
      };
    }
  }
}
