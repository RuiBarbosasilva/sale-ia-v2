import { prisma } from '../../mercadoLivre/lib/prisma';

export class CriativoService {
  async gerarCriativo(produtoId: string, copyId: string) {
    try {
      console.log('[CriativoService] Iniciando geração para produto:', produtoId);

      const produto = await prisma.afiliadoProduto.findUnique({ where: { id: produtoId } });
      const copy = await prisma.afiliadoCopy.findUnique({ where: { id: copyId } });

      if (!produto || !copy) {
        throw new Error('Produto ou Copy não encontrados no banco de dados.');
      }

      const roteiroVideo = `🎬 ROTEIRO DE VÍDEO: ${produto.nome}

🎯 Cena 1 (0-3s) - GANCHO:
Visual: Imagem impactante relacionada ao produto.
Texto na tela: "Conheça esta oportunidade."

🎯 Cena 2 (3-10s) - SOLUÇÃO:
Visual: Imagem profissional do ${produto.nome}.
Texto na tela: "Uma solução para facilitar sua rotina."

🎯 Cena 3 (10-15s) - BENEFÍCIOS:
Visual: Demonstração real do produto e seus benefícios.
Texto na tela: "Veja como ele pode fazer parte do seu dia a dia."

🎯 Cena 4 (15-20s) - CHAMADA PARA AÇÃO (CTA):
Visual: Setas apontando para o link ou botão.
Texto na tela: "Acesse o link e conheça todos os detalhes."`;

      const promptImagem = `Professional product photography of ${produto.nome}, clean commercial composition, high resolution, photorealistic, commercial lighting, no text, studio lighting`;

      console.log('[CriativoService] Salvando no banco de dados...');

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
      console.error('[CriativoService] ERRO CRÍTICO:', error.message);
      throw new Error('Falha ao gerar criativo: ' + error.message);
    }
  }
}
