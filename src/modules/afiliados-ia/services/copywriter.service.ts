import { prisma } from '../../mercadoLivre/lib/prisma';

const AIDA_TEMPLATES: any = {
  saude: {
    attention: [
      "Pare de gastar com o que nao funciona!",
      "O segredo que os especialistas recomendam",
      "Transforme sua saude em 30 dias"
    ],
    interest: [
      "Sua rotina merece esse cuidado extra, com ingredientes de alta absorcao",
      "Formula desenvolvida por especialistas em nutricao",
      "Resultados visiveis ja nas primeiras semanas"
    ],
    desire: [
      "Milhares de pessoas ja transformaram seu bem-estar em poucas semanas",
      "Mais de 15 mil clientes satisfeitos em todo o Brasil",
      "Garantia de 30 dias ou seu dinheiro de volta"
    ],
    action: [
      "Comenta EU QUERO que te envio o link com desconto exclusivo!",
      "Clica no link da bio e garanta o seu agora!",
      "Me chama no direct que te conto mais!"
    ]
  },
  tecnologia: {
    attention: [
      "Achadinho do Mercado Livre que vai facilitar sua vida!",
      "Pare de pagar caro em marcas famosas",
      "O gadget que todo mundo esta comprando"
    ],
    interest: [
      "Qualidade premium, entrega Full e garantia de 1 ano direto do ML",
      "Mais de 5 mil vendidos com avaliacao 5 estrelas",
      "Produto original com nota fiscal e suporte tecnico"
    ],
    desire: [
      "Imagina ter essa praticidade no seu dia a dia, economizando tempo e dinheiro",
      "Seus amigos vao querer saber onde voce comprou",
      "A melhor relacao custo-beneficio do mercado"
    ],
    action: [
      "Comenta QUERO que te mando o link com o melhor preco!",
      "Link na bio, corre que o estoque acaba!",
      "Me chama no direct que te envio o cupom!"
    ]
  },
  corporativo: {
    attention: [
      "O presente perfeito que impressiona qualquer cliente ou colaborador!",
      "Eleve o nivel da sua empresa com este kit exclusivo",
      "Brindes corporativos que fazem a diferenca"
    ],
    interest: [
      "Acabamento premium, embalagem sofisticada e pronta para presente",
      "Personalizacao disponivel para sua marca",
      "Ideal para eventos, confraternizacoes e presentes de fim de ano"
    ],
    desire: [
      "Seja lembrado como a empresa que tem bom gosto e valoriza as pessoas",
      "Mais de 500 empresas ja usaram nossos kits em seus eventos",
      "Entrega rapida para todo o Brasil com nota fiscal"
    ],
    action: [
      "Comenta PRESENTE que te envio o link com condicao especial para CNPJ!",
      "Me chama no direct que faco um orcamento personalizado!",
      "Link na bio com catalogo completo!"
    ]
  },
  casa: {
    attention: [
      "Transforme sua casa com esse achadinho incrivel!",
      "O item que faltava para deixar seu ambiente mais aconchegante",
      "Decoracao moderna que cabe no seu bolso"
    ],
    interest: [
      "Design moderno, material resistente e super facil de limpar",
      "Produto com entrega Full e garantia do Mercado Livre",
      "Mais de 3 mil vendidos com avaliacao 5 estrelas"
    ],
    desire: [
      "Seus visitantes vao elogiar e voce vai se sentir orgulhoso da sua escolha",
      "Transforme qualquer ambiente em minutos",
      "A melhor relacao custo-beneficio para decoracao"
    ],
    action: [
      "Comenta CASA que te envio o link com frete gratis!",
      "Link na bio, corre que o estoque e limitado!",
      "Me chama no direct que te ajudo a escolher!"
    ]
  },
  default: {
    attention: [
      "Oportunidade imperdivel no Mercado Livre!",
      "Achadinho que voce precisa conhecer",
      "Oferta relampago por tempo limitado"
    ],
    interest: [
      "Produto com excelente avaliacao e entrega rapida garantida",
      "Mais de 1 mil vendidos com nota fiscal",
      "Qualidade premium com garantia do vendedor"
    ],
    desire: [
      "Estoque limitado e o preco esta abaixo da media do mercado",
      "Milhares de clientes satisfeitos em todo o Brasil",
      "Entrega Full em 24h para capitais"
    ],
    action: [
      "Comenta QUERO para receber o link antes que acabe!",
      "Link na bio, corre que e por tempo limitado!",
      "Me chama no direct que te envio o cupom!"
    ]
  }
};

export class CopywriterService {
  async gerarCopies(produtoId: string, quantidade: number = 3) {
    const produto = await prisma.afiliadoProduto.findUnique({ where: { id: produtoId } });
    if (!produto) throw new Error('Produto nao encontrado');

    const copies = [];
    const template = AIDA_TEMPLATES[produto.categoria] || AIDA_TEMPLATES.default;

    for (let i = 0; i < quantidade; i++) {
      const attention = template.attention[i % template.attention.length];
      const interest = template.interest[i % template.interest.length];
      const desire = template.desire[i % template.desire.length];
      const action = template.action[i % template.action.length];
      const texto = attention + '\n\n' + interest + '\n\n' + desire + '\n\n' + action;

      const copy = await prisma.afiliadoCopy.create({
        data: {
          produtoId,
          tipo: 'reel',
          conteudo: texto,
          canal: 'instagram'
        }
      });
      copies.push(copy);
    }

    console.log('[Copywriter] ' + copies.length + ' copies geradas para: ' + produto.nome + ' (categoria: ' + produto.categoria + ')');
    return copies;
  }
}
