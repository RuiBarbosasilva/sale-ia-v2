import { prisma } from '../../modules/mercadoLivre/lib/prisma';

export class ContentGeneratorService {
  private readonly GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
  // Usando o modelo 1.5-flash que Ã© o mais estÃ¡vel e gratuito atualmente
  private readonly GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

  async generateContentForProduct(productId: string) {
    console.log('[ContentGen] Buscando produto:', productId);
    
    const product = await prisma.afiliadoProduto.findUnique({ where: { id: productId } });
    if (!product) throw new Error('Produto nao encontrado');

    console.log('[ContentGen] Produto encontrado:', product.nome);
    
    const prompt = `Voce e um copywriter SEO especializado em reviews de produtos para o mercado brasileiro.
PRODUTO: ${product.nome}
PLATAFORMA: ${product.plataforma}
LINK DE AFILIADO: ${product.linkAfiliado}

Crie EXATAMENTE a seguinte estrutura em JSON valido (sem markdown, sem crases):
{
  "seoArticle": {
    "title": "Titulo otimizado para SEO com 50-60 chars",
    "h1": "H1 do artigo, mais descritivo",
    "metaDescription": "Meta description persuasiva com 150-160 chars",
    "content": "Artigo completo em HTML (usando h2, h3, p, ul, strong). Introducao, caracteristicas, pros e contras, veredicto. Inclua o link de afiliado 2 vezes como href.",
    "tags": ["tag1", "tag2", "tag3"]
  },
  "pinterestPin": {
    "title": "Titulo chamativo para Pinterest (max 100 chars)",
    "description": "Descricao persuasiva com CTA e hashtags (max 500 chars)",
    "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3"]
  }
}`;

    try {
      console.log('[ContentGen] Chamando Gemini AI...');
      const response = await fetch(this.GEMINI_URL + '?key=' + this.GEMINI_API_KEY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('[ContentGen] Erro na API do Gemini:', response.status, errText);
        throw new Error('Falha na API do Gemini: ' + response.status);
      }

      const data = await response.json() as {
        candidates?: Array<{
          content?: {
            parts?: Array<{
              text?: string;
            }>;
          };
        }>;
      };
      const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Resposta da IA nao contem JSON valido');
      
      const generated = JSON.parse(jsonMatch[0]);

      return {
        productId: product.id,
        productName: product.nome,
        affiliateLink: product.linkAfiliado,
        platform: product.plataforma,
        seoArticle: generated.seoArticle,
        pinterestPin: generated.pinterestPin
      };

    } catch (error: any) {
      console.error('[ContentGen] Erro ao gerar conteudo com IA:', error.message);
      
      // FALLBACK: Se a IA falhar, retorna um conteÃºdo bÃ¡sico para nÃ£o quebrar o sistema
      console.log('[ContentGen] Usando modo FALLBACK (conteÃºdo bÃ¡sico) devido a erro na IA.');
      return {
        productId: product.id,
        productName: product.nome,
        affiliateLink: product.linkAfiliado,
        platform: product.plataforma,
        seoArticle: {
          title: `Review: ${product.nome} - Vale a Pena?`,
          h1: `AnÃ¡lise Completa: ${product.nome}`,
          metaDescription: `Confira nossa anÃ¡lise sobre ${product.nome}. Descubra se vale a pena comprar e veja onde encontrar o melhor preÃ§o.`,
          content: `<h2>Sobre o Produto</h2><p>O produto ${product.nome} tem se destacado no mercado pela sua qualidade e custo-benefÃ­cio.</p><h2>Principais BenefÃ­cios</h2><ul><li>Alta qualidade de construÃ§Ã£o</li><li>Excelente custo-benefÃ­cio</li><li>FÃ¡cil de usar</li></ul><p>Para garantir o melhor preÃ§o e frete, recomendamos a compra atravÃ©s do link oficial: <a href="${product.linkAfiliado}" target="_blank" rel="nofollow">Ver Melhor Oferta Aqui</a>.</p>`,
          tags: ["review", "oferta", product.plataforma]
        },
        pinterestPin: {
          title: `ðŸ”¥ Oferta ImperdÃ­vel: ${product.nome.substring(0, 40)}...`,
          description: `NÃ£o perca essa chance! ${product.nome} com preÃ§o especial. Clique no link para garantir o seu antes que acabe! #Oferta #PromoÃ§Ã£o #Afiliado`,
          hashtags: ["#Oferta", "#PromoÃ§Ã£o", "#Afiliado"]
        }
      };
    }
  }
}
