import { prisma } from '../../modules/mercadoLivre/lib/prisma';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'sua-chave-aqui',
});

// Flag de modo mock (simulação sem gastar créditos)
const USE_MOCK = process.env.MOCK_AI === 'true' || 
                 !process.env.OPENAI_API_KEY || 
                 process.env.OPENAI_API_KEY === 'sua-chave-aqui';

export interface GeneratedContent {
  copyId: string;
  creativeId: string;
  videoPrompt: string;
  elevenLabsScript: string;
  instagramCaption: string;
}

export const generateAffiliateContent = async (
  productId: string
): Promise<GeneratedContent> => {
  const product = await prisma.affiliateProduct.findUnique({
    where: { id: productId }
  });

  if (!product) {
    throw new Error('Produto afiliado nao encontrado');
  }

  console.log('[AI Content] Gerando conteudo para: ' + product.name);

  // Se estiver em modo mock, retorna dados simulados
  if (USE_MOCK) {
    console.log('[AI Content] MODO MOCK ATIVADO: Gerando dados simulados...');
    
    const description = product.description || 'Produto afiliado para promoção comercial.';
    const mockData = {
      videoPrompt4K: '4K resolution, cinematic lighting, dynamic camera movement, hyper-realistic commercial video showing the product "' + product.name + '" in practical use. Category: ' + (product.category || 'general') + '. Show clear benefits, professional composition, strong visual hook in the first 3 seconds, no misleading claims.',
      elevenLabsScript: 'Conheça ' + product.name + '. [pausa curta] Uma opção para quem procura ' + (product.category || 'uma solução prática') + '. [entonação empolgada] Veja os detalhes, benefícios e condições da oferta antes de decidir. [pausa] Acesse o link da campanha para conhecer o produto.',
      instagramCaption: 'Conheça ' + product.name + '.\n\n✅ Confira os principais benefícios\n✅ Veja os detalhes da oferta\n✅ Compare antes de decidir\n\nAcesse o link para saber mais.\n\n#Afiliados #' + (product.category || 'Ofertas').replace(/\\s+/g, '') + ' #Dicas #Produtos #Compras'
    };

    const result = await prisma.$transaction(async (tx) => {
      const copyRecord = await tx.affiliateCopy.create({
        data: {
          produtoId: product.id,
          tipo: 'video_script_and_caption',
          conteudo: JSON.stringify({
            roteiroVoz: mockData.elevenLabsScript,
            legenda: mockData.instagramCaption
          }),
          canal: 'instagram',
          status: 'ATIVO'
        }
      });

      const creativeRecord = await tx.affiliateCreative.create({
        data: {
          produtoId: product.id,
          tipo: 'video',
          descricao: 'Roteiro e prompt gerados (MOCK) para ' + product.name,
          promptUsado: mockData.videoPrompt4K,
          status: 'ATIVO'
        }
      });

      return { copyRecord, creativeRecord, generatedData: mockData };
    });

    console.log('[AI Content] Conteudo MOCK gerado e salvo com sucesso para: ' + product.name);

    return {
      copyId: result.copyRecord.id,
      creativeId: result.creativeRecord.id,
      videoPrompt: result.generatedData.videoPrompt4K,
      elevenLabsScript: result.generatedData.elevenLabsScript,
      instagramCaption: result.generatedData.instagramCaption,
    };
  }

  // Modo real: Chama a OpenAI
  const systemPrompt = 'Voce e um especialista em marketing de afiliados, copywriting de alta conversao e direcao de videos virais. Seu objetivo e criar conteudo para promover um produto. O produto e: "' + product.name + '" (Categoria: ' + (product.category || 'Geral') + '). Descricao: ' + (product.description || 'produto') + '.\n\nRetorne APENAS um objeto JSON valido com a estrutura:\n{\n  "videoPrompt4K": "Prompt detalhado em ingles para IA de video (Runway, Sora). Inclua: 4K resolution, cinematic lighting, dynamic camera movement, hyper-realistic, descricao visual do produto em uso, foco em retencao nos primeiros 3 segundos.",\n  "elevenLabsScript": "Roteiro de fala em portugues para sintese de voz (ElevenLabs). Use marcacoes como [pausa curta], [entonacao empolgada], [sussurro]. Maximo 150 palavras. Foco em dor -> solucao -> CTA.",\n  "instagramCaption": "Legenda para Instagram/TikTok em portugues. Use 1 gancho forte na primeira linha, 3 beneficios em bullet points com emojis, e uma CTA clara no final. Inclua 5 hashtags relevantes."\n}';

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: 'Gere o conteudo JSON para o produto: ' + product.name }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.8,
  });

  const responseText = completion.choices[0].message.content;
  if (!responseText) {
    throw new Error('A IA nao retornou conteudo valido');
  }

  let generatedData;
  try {
    generatedData = JSON.parse(responseText);
  } catch (error) {
    console.error('[AI Content] Erro ao parsear JSON da IA:', responseText);
    throw new Error('Falha ao processar resposta da IA');
  }

  const result = await prisma.$transaction(async (tx) => {
    const copyRecord = await tx.affiliateCopy.create({
      data: {
        produtoId: product.id,
        tipo: 'video_script_and_caption',
        conteudo: JSON.stringify({
          roteiroVoz: generatedData.elevenLabsScript,
          legenda: generatedData.instagramCaption
        }),
        canal: 'instagram',
        status: 'ATIVO'
      }
    });

    const creativeRecord = await tx.affiliateCreative.create({
      data: {
        produtoId: product.id,
        tipo: 'video',
        descricao: 'Roteiro e prompt gerados para ' + product.name,
        promptUsado: generatedData.videoPrompt4K,
        status: 'ATIVO'
      }
    });

    return { copyRecord, creativeRecord, generatedData };
  });

  console.log('[AI Content] Conteudo gerado e salvo com sucesso para: ' + product.name);

  return {
    copyId: result.copyRecord.id,
    creativeId: result.creativeRecord.id,
    videoPrompt: result.generatedData.videoPrompt4K,
    elevenLabsScript: result.generatedData.elevenLabsScript,
    instagramCaption: result.generatedData.instagramCaption,
  };
};

export const generateContentForAllActiveProducts = async () => {
  const products = await prisma.affiliateProduct.findMany({
    where: { 
      status: { in: ['ATIVO', 'SHORTLISTED', 'ANALYZED'] },
      criativos: { none: {} }
    },
    take: 5
  });

  console.log('[AI Content] Iniciando geracao em lote para ' + products.length + ' produtos...');
  
  const results = [];
  for (const product of products) {
    try {
      const res = await generateAffiliateContent(product.id);
      results.push({ productId: product.id, success: true, ...res });
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error('[AI Content] Falha ao gerar para ' + product.name + ':', error);
      results.push({ productId: product.id, success: false, error });
    }
  }
  
  return results;
};