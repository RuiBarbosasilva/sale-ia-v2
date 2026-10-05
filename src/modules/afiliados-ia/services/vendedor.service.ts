import { prisma } from '../../mercadoLivre/lib/prisma';

export class VendedorVirtualService {
  async gerarFluxoVendas(produtoId: string) {
    const produto = await prisma.afiliadoProduto.findUnique({ where: { id: produtoId } });
    if (!produto) throw new Error('Produto não encontrado');

    const link = produto.linkAfiliado || 'LINK_NA_BIO';
    const nome = produto.nome;
    const categoria = produto.categoria;

    const objecao = categoria === 'saude' 
      ? 'Muita gente pergunta se funciona. Esse produto tem informações claras sobre o produto e as condições de garantia informadas pelo fabricante.'
      : 'Muita gente pergunta sobre a qualidade. Esse produto tem as condições de garantia e as avaliações disponíveis na página do produto.';

    const fluxo = {
      mensagemBoasVindas: 'Olá! 👋 Vi que você tem interesse no *' + nome + '*.\n\nÉ uma excelente escolha! Ele é perfeito para quem busca qualidade e resultado rápido.',
      mensagemQuebraObjecao: objecao,
      mensagemFechamento: '🔥 Restam poucas unidades com esse valor!\n\nClique no link seguro abaixo para garantir o seu agora:\n👉 ' + link + '\n\nSe tiver qualquer dúvida, estou por aqui!',
      observacao: 'Este fluxo pode ser copiado e colado no ManyChat, Typebot ou respondido manualmente no WhatsApp/Direct.'
    };

    console.log('[Vendedor Virtual] Fluxo de vendas gerado para: ' + nome);
    return fluxo;
  }
}
