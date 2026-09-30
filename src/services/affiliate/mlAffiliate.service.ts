import { prisma } from '../../modules/mercadoLivre/lib/prisma';

export class MlAffiliateService {
  private trackingId = process.env.ML_AFFILIATE_TRACKING_ID || 'rb20260926202806204';

  async addProductsFromUrls(urls: string[]) {
    const results = [];
    
    for (const url of urls) {
      try {
        console.log('[ML Service] Processando URL:', url.substring(0, 60) + '...');
        
        // Extrai o ID do produto (ex: MLB-123456789)
        const match = url.match(/(MLB-[0-9]+)/i);
        if (!match) {
          results.push({ url, success: false, error: 'URL inválida ou ID não encontrado' });
          continue;
        }
        
        const itemId = match[1].toUpperCase();
        
        // Extrai o nome do produto do slug da URL
        let productName = "Produto Mercado Livre";
        const slugMatch = url.match(/MLB-[0-9]+-([^-]+(?:-[^-]+)*)/i);
        if (slugMatch) {
          const slug = slugMatch[1].replace(/-_/g, '').replace(/-/g, ' ');
          productName = slug.split(' ').map((word: string) => 
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
          ).join(' ');
        }

        // Gera o link de afiliado oficial
        const cleanUrl = url.split('?')[0];
        const affiliateLink = `${cleanUrl}?matt_tool=${this.trackingId}`;

        // Verifica se já existe
        const exists = await prisma.afiliadoProduto.findFirst({
          where: { produtoIdExterno: itemId }
        });

        if (exists) {
          results.push({ 
            url, 
            itemId, 
            success: true, 
            message: 'Já existe no banco',
            nome: exists.nome,
            link: exists.linkAfiliado 
          });
        } else {
          // Salva no banco COM TODOS OS CAMPOS OBRIGATÓRIOS
          const newProduct = await prisma.afiliadoProduto.create({
            data: {
              nome: productName,
              plataforma: 'mercadolivre',
              produtoIdExterno: itemId,
              linkAfiliado: affiliateLink,
              status: 'ativo',
              tipo: 'fisico',
              preco: 0.0,
              comissaoPercentual: 8.0,
              score: 8.5 // <-- CAMPO ADICIONADO
            }
          });
          console.log('[ML Service] ✅ Produto salvo com sucesso!');
          results.push({ 
            url, 
            itemId, 
            success: true, 
            nome: productName, 
            link: affiliateLink 
          });
        }

      } catch (error: any) {
        console.error('[ML Service] ❌ Erro ao processar URL:', error.message);
        results.push({ url, success: false, error: error.message });
      }
    }
    
    return results;
  }
}
