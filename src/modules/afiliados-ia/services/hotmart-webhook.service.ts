import { prisma } from '../../mercadoLivre/lib/prisma';

export class HotmartWebhookService {
  async processarEvento(evento: any) {
    const eventoNome = evento.event || evento.eventName;
    const dados = evento.data || evento;
    
    console.log('[Hotmart Webhook] Evento recebido: ' + eventoNome);

    if (eventoNome === 'PURCHASE_APPROVED') {
      const transacao = dados.transaction || dados;
      const produto = transacao.product || {};
      const comprador = transacao.buyer || {};
      const comissao = transacao.commission?.value || 0;
      const valorVenda = transacao.price?.value || 0;
      const hotmartId = transacao.hid || transacao.transaction_id;

      // Busca o produto no nosso banco (se existir)
      let produtoAfiliado = await prisma.afiliadoProduto.findFirst({
        where: { 
          OR: [
            { produtoIdExterno: String(produto.id || '') },
            { nome: { contains: produto.name || '' } }
          ]
        }
      });

      // Se não existir, cria um registro bÃ¡sico
      if (!produtoAfiliado) {
        produtoAfiliado = await prisma.afiliadoProduto.create({
          data: {
            plataforma: 'hotmart',
            produtoIdExterno: String(produto.id || 'hotmart_' + Date.now()),
            nome: produto.name || 'Produto Hotmart',
            categoria: 'outros',
            tipo: 'digital',
            preco: valorVenda,
            comissaoPercentual: 0,
            linkAfiliado: '',
            score: 8.0,
            status: 'ativo'
          }
        });
      }

      // Webhooks podem ser reenviados pela Hotmart; torna o processamento idempotente.
      const vendaExistente = hotmartId
        ? await prisma.afiliadoPublicacao.findFirst({ where: { postIdExterno: hotmartId } })
        : null;

      if (vendaExistente) {
        return {
          recebido: true,
          evento: eventoNome,
          vendaId: vendaExistente.id,
          comissao: vendaExistente.comissaoGerada || 0,
          duplicado: true
        };
      }

      // Registra a venda
      const venda = await prisma.afiliadoPublicacao.create({
        data: {
          produtoId: produtoAfiliado.id,
          canal: 'hotmart_webhook',
          postIdExterno: hotmartId,
          dataPublicacao: new Date(),
          vendasConfirmadas: 1,
          comissaoGerada: comissao,
          status: 'venda_confirmada'
        }
      });

      // Atualiza totais do produto
      await prisma.afiliadoProduto.update({
        where: { id: produtoAfiliado.id },
        data: {
          vendasConfirmadas: { increment: 1 },
          comissaoTotal: { increment: comissao }
        }
      });

      console.log('[Hotmart Webhook] VENDA REGISTRADA!');
      console.log('  Produto: ' + produtoAfiliado.nome);
      console.log('  Valor: R$ ' + valorVenda);
      console.log('  Comissão: R$ ' + comissao);
      console.log('  Hotmart ID: ' + hotmartId);

      return { 
        recebido: true, 
        evento: eventoNome, 
        vendaId: venda.id,
        comissao: comissao 
      };
    }

    if (eventoNome === 'PURCHASE_REFUNDED') {
      const transacao = dados.transaction || dados;
      const hotmartId = transacao.hid || transacao.transaction_id;
      
      const venda = await prisma.afiliadoPublicacao.findFirst({
        where: { postIdExterno: hotmartId }
      });

      if (venda) {
        const comissaoAnterior = Number(venda.comissaoGerada || 0);
        const vendasAnteriores = Number(venda.vendasConfirmadas || 0);

        await prisma.afiliadoPublicacao.update({
          where: { id: venda.id },
          data: {
            status: 'reembolso',
            vendasConfirmadas: 0,
            comissaoGerada: 0
          }
        });

        const produto = await prisma.afiliadoProduto.findUnique({ where: { id: venda.produtoId } });
        if (produto) {
          await prisma.afiliadoProduto.update({
            where: { id: produto.id },
            data: {
              vendasConfirmadas: { decrement: Math.min(vendasAnteriores, Number(produto.vendasConfirmadas || 0)) },
              comissaoTotal: { decrement: Math.min(comissaoAnterior, Number(produto.comissaoTotal || 0)) }
            }
          });
        }

        console.log('[Hotmart Webhook] Reembolso registrado para: ' + hotmartId);
      }

      return { recebido: true, evento: eventoNome, reembolso: hotmartId };
    }

    // Outros eventos - apenas loga
    console.log('[Hotmart Webhook] Evento nao tratado: ' + eventoNome);
    return { recebido: true, evento: eventoNome, info: 'evento registrado para analise' };
  }
}
