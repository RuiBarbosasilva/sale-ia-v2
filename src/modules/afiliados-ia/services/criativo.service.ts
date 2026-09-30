import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class CriativoService {
  async gerarCriativo(produtoId: string, copyId: string) {
    try {
      console.log('[CriativoService] Iniciando geraÃ§Ã£o para produto:', produtoId);

      const produto = await prisma.afiliadoProduto.findUnique({ where: { id: produtoId } });
      const copy = await prisma.afiliadoCopy.findUnique({ where: { id: copyId } });

      if (!produto || !copy) {
        throw new Error('Produto ou Copy nÃ£o encontrados no banco de dados.');
      }

      const roteiroVideo = `ðŸŽ¬ ROTEIRO DE VÃDEO: ${produto.nome}

ðŸŽ¯ Cena 1 (0-3s) - GANCHO:
Visual: Imagem impactante do problema.
Texto na tela: "Pare de gastar com o que nÃ£o funciona!"

ðŸŽ¯ Cena 2 (3-10s) - SOLUÃ‡ÃƒO:
Visual: Imagem profissional do ${produto.nome}.
Texto na tela: "Sua rotina merece esse cuidado extra."

ðŸŽ¯ Cena 3 (10-15s) - PROVA SOCIAL:
Visual: Depoimento ou imagem de resultado.
Texto na tela: "Milhares de pessoas jÃ¡ transformaram seu bem-estar."

ðŸŽ¯ Cena 4 (15-20s) - CHAMADA PARA AÃ‡ÃƒO (CTA):
Visual: Setas apontando para o link ou botÃ£o.
Texto na tela: "Comenta EU QUERO que te envio o link com desconto!"`;

      const promptImagem = `Professional product photography of ${produto.nome}, health supplement bottle, clean white background, high resolution, 8k, photorealistic, commercial lighting, no text, studio lighting`;

      console.log('[CriativoService] Salvando no banco de dados...');
      
      // Usando a sintaxe 'connect' do Prisma, que Ã© universal para relaÃ§Ãµes
      const descricaoCriativo = JSON.stringify({
        copyId,
        roteiroVideo,
        promptImagem
      });

      const criativo = await prisma.afiliadoCriativo.create({
        data: {
          produtoId,
          tipo: 'video_imagem',
          descricao: descricaoCriativo,
          url: '',
          status: 'gerado'
        }
      });
      console.log('[CriativoService] Criativo salvo com sucesso! ID:', criativo.id);

      return {
        sucesso: true,
        dados: {
          id: criativo.id,
          roteiroVideo,
          promptImagem
        }
      };

    } catch (error: any) {
      console.error('[CriativoService] ERRO CRÃTICO:', error.message);
      throw new Error('Falha ao gerar criativo: ' + error.message);
    }
  }
}
