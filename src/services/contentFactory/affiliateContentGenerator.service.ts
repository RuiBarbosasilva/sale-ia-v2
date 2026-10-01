import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';

const prisma = new PrismaClient();

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

  console.log('[AI Content] Gerando conteudo para: ' + product.nome);

  // Se estiver em modo mock, retorna dados simulados
  if (USE_MOCK) {
    console.log('[AI Content] MODO MOCK ATIVADO: Gerando dados simulados...');
    
    const mockData = {
      videoPrompt4K: '4K resolution, cinematic lighting, dynamic camera movement, hyper-realistic, a professional marketer working on a laptop with glowing holographic charts floating in the air, golden hour lighting, highly detailed, 8k render, Unreal Engine 5 style, slow zoom in.',
      elevenLabsScript: 'Voce ja se sentiu frustrado [pausa curta] tentando vender online e nao ter resultados? [entonação empolgada] Imagine ter um sistema que faz o trafego trabalhar por voce. [pausa] Com o Curso Master de Trafego Pago, voce aprende a escalar suas vendas de forma previsivel. [sussurro] Nao deixe essa oportunidade passar. Clique no link agora mesmo.',
      instagramCaption: '🚀 Pare de queimar dinheiro com anuncios que nao convertem!\n\n✅ Aprenda a estruturar campanhas do zero\n✅ Domine o pixel e a segmentacao avancada\n✅ Escale seus resultados com seguranca\n\n👇 Comente "TRAFEGO" que eu te envio o link no direct!\n\n#MarketingDigital #TrafegoPago #VendasOnline #Empreendedorismo #Growth'
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
          descricao: 'Roteiro e prompt gerados (MOCK) para ' + product.nome,
          promptUsado: mockData.videoPrompt4K,
          status: 'ATIVO'
        }
      });

      return { copyRecord, creativeRecord, generatedData: mockData };
    });

    console.log('[AI Content] Conteudo MOCK gerado e salvo com sucesso para: ' + product.nome);

    return {
      copyId: result.copyRecord.id,
      creativeId: result.creativeRecord.id,
      videoPrompt: result.generatedData.videoPrompt4K,
      elevenLabsScript: result.generatedData.elevenLabsScript,
      instagramCaption: result.generatedData.instagramCaption,
    };
  }

  // Modo real: Chama a OpenAI
  const systemPrompt = 'Voce e um especialista em marketing de afiliados, copywriting de alta conversao e direcao de videos virais. Seu objetivo e criar conteudo para promover um produto. O produto e: "' + product.nome + '" (Categoria: ' + (product.categoria || 'Geral') + '). Descricao: ' + product.tipo + '.\n\nRetorne APENAS um objeto JSON valido com a estrutura:\n{\n  "videoPrompt4K": "Prompt detalhado em ingles para IA de video (Runway, Sora). Inclua: 4K resolution, cinematic lighting, dynamic camera movement, hyper-realistic, descricao visual do produto em uso, foco em retencao nos primeiros 3 segundos.",\n  "elevenLabsScript": "Roteiro de fala em portugues para sintese de voz (ElevenLabs). Use marcacoes como [pausa curta], [entonacao empolgada], [sussurro]. Maximo 150 palavras. Foco em dor -> solucao -> CTA.",\n  "instagramCaption": "Legenda para Instagram/TikTok em portugues. Use 1 gancho forte na primeira linha, 3 beneficios em bullet points com emojis, e uma CTA clara no final. Inclua 5 hashtags relevantes."\n}';

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: 'Gere o conteudo JSON para o produto: ' + product.nome }
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
        descricao: 'Roteiro e prompt gerados para ' + product.nome,
        promptUsado: generatedData.videoPrompt4K,
        status: 'ATIVO'
      }
    });

    return { copyRecord, creativeRecord, generatedData };
  });

  console.log('[AI Content] Conteudo gerado e salvo com sucesso para: ' + product.nome);

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
      status: 'ATIVO',
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
      console.error('[AI Content] Falha ao gerar para ' + product.nome + ':', error);
      results.push({ productId: product.id, success: false, error });
    }
  }
  
  return results;
};