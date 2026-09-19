import { prisma } from '../modules/mercadoLivre/lib/prisma';

type Playbook = {
  network: string;
  principles: string[];
  signals: string[];
  content: string[];
  conversion: string[];
  measurement: string[];
  restrictions: string[];
};

const PLAYBOOKS: Record<string, Playbook> = {
  hotmart: {
    network: 'hotmart',
    principles: ['Escolher produtos alinhados ao nicho','Priorizar sinais de demanda e conversão','Construir audiência e funil em vez de apenas publicar links','Testar criativos e mensagens continuamente'],
    signals: ['indicadores de performance quando disponíveis','comissão','demanda','taxa de conversão','reembolso/chargeback quando disponível','qualidade da página de vendas'],
    content: ['conteúdo original orientado a problema e solução','reviews e comparativos honestos','vídeos curtos com gancho e CTA','conteúdo educativo antes da oferta'],
    conversion: ['landing page própria quando permitida','CTA contextual','captura de lead quando compatível com a oferta','retargeting somente quando permitido pelo canal'],
    measurement: ['CTR','taxa de conversão','EPC/receita por clique quando disponível','CPA/CAC em mídia paga','reembolso/chargeback','comissão líquida'],
    restrictions: ['respeitar regras do produto, Hotmart e canal de divulgação']
  },
  eduzz: {
    network: 'eduzz',
    principles: ['Priorizar produtos com vendas recentes','Avaliar qualidade da oferta','Usar campanhas e links rastreáveis','Medir atribuição e conversão'],
    signals: ['vendas recentes','posição na vitrine','comissão','conversão','reembolso/chargeback quando disponível'],
    content: ['conteúdo original','demonstrações','comparativos factuais','FAQ e objeções'],
    conversion: ['link de campanha rastreável','landing page quando permitido','CTA contextual'],
    measurement: ['cliques','conversão','comissão','reembolso','receita por conteúdo'],
    restrictions: ['seguir regras da Eduzz e do produto; não alterar mecanismos de atribuição de forma indevida']
  },
  kiwify: {
    network: 'kiwify',
    principles: ['Priorizar produtos com vendas recentes','Considerar reembolso e chargeback','Avaliar oferta antes de promover','Usar atribuição e links oficiais'],
    signals: ['faturamento recente','reembolso','chargeback','comissão','qualidade da oferta'],
    content: ['demonstração e educação','prova baseada em fatos','short video','conteúdo de intenção de compra'],
    conversion: ['CTA claro','landing page quando permitido','testes A/B de mensagem e criativo'],
    measurement: ['CTR','CVR','receita por clique','reembolso','comissão líquida'],
    restrictions: ['respeitar as regras de afiliação e atribuição da Kiwify']
  },
  'amazon-afiliados': {
    network: 'amazon-afiliados',
    principles: ['Criar conteúdo original que agregue valor','Focar em curadoria, reviews e comparação útil','Construir presença própria antes de escalar'],
    signals: ['demanda do produto','intenção de compra','comissão por categoria','conversão histórica própria'],
    content: ['reviews originais','comparativos','listas de compra','guias de uso e seleção'],
    conversion: ['links contextuais e identificados','conteúdos com intenção de compra','SEO quando permitido'],
    measurement: ['cliques','pedidos qualificados','receita','taxa de conversão','comissão'],
    restrictions: ['seguir o acordo operacional, políticas de conteúdo e regras de anúncios da Amazon']
  },
  'shopee-afiliados': {
    network: 'shopee-afiliados',
    principles: ['Escolher produtos com intenção de compra clara','Criar conteúdo social nativo','Usar somente canais e formatos permitidos','Otimizar por clique e venda'],
    signals: ['demanda','preço','desconto real','avaliações','comissão','conversão própria'],
    content: ['vídeos curtos demonstrativos','listas e achados','comparativos factuais','conteúdo de utilidade'],
    conversion: ['CTA contextual','link visível e clicável','landing intermediária apenas quando permitida'],
    measurement: ['CTR','pedidos','receita','comissão','ROI quando houver mídia paga'],
    restrictions: ['não fazer scraping automatizado proibido; não usar palavras-chave de marca em search/shopping quando proibido; não gerar cliques ou cookies artificiais; seguir os termos da Shopee']
  },
  braip: {
    network: 'braip',
    principles: ['avaliar oferta e comissão','validar criativo e público','usar rastreamento de campanha'],
    signals: ['comissão','demanda','conversão','qualidade da oferta'],
    content: ['conteúdo educativo','demonstração','objeções','short video'],
    conversion: ['CTA contextual','landing page quando permitida','teste controlado'],
    measurement: ['CTR','CVR','comissão','reembolso'],
    restrictions: ['seguir regras atuais da plataforma e do produtor']
  },
  monetizze: {
    network: 'monetizze',
    principles: ['selecionar ofertas com demanda','validar página e público','trabalhar funil e rastreamento'],
    signals: ['comissão','demanda','conversão','reembolso'],
    content: ['educação','review factual','comparativo','vídeo curto'],
    conversion: ['CTA contextual','landing page quando permitida','captura de lead quando compatível'],
    measurement: ['CTR','CVR','EPC','comissão líquida','reembolso'],
    restrictions: ['seguir regras atuais da plataforma e do produtor']
  }
};

const GENERIC: Playbook = {
  network: 'generic',
  principles: ['Escolher produto por evidência, não apenas comissão','Construir audiência própria','Criar conteúdo original que ajude na decisão','Testar pequenos experimentos','Otimizar pelo resultado líquido'],
  signals: ['demanda','conversão','comissão','qualidade','reembolso','concorrência','saturação'],
  content: ['problema/solução','review factual','comparativo','tutorial','FAQ','short video'],
  conversion: ['CTA contextual','landing page quando permitida','captura de lead quando compatível','tracking'],
  measurement: ['CTR','CVR','receita por clique','comissão líquida','reembolso','custo por aquisição quando houver mídia paga'],
  restrictions: ['usar somente automações e canais autorizados pela plataforma']
};

function getPlaybook(slug: string): Playbook {
  return PLAYBOOKS[slug] || { ...GENERIC, network: slug };
}

export const affiliateSalesStrategyService = {
  async getNetworkPlaybook(networkId: string) {
    const network = await prisma.affiliateNetwork.findUnique({ where: { id: networkId } });
    if (!network) throw new Error('NETWORK_NOT_FOUND');
    return { network: { id: network.id, name: network.name, slug: network.slug }, playbook: getPlaybook(network.slug) };
  },

  async buildProductStrategy(productId: string) {
    const product = await prisma.affiliateProduct.findUnique({ where: { id: productId }, include: { network: true } });
    if (!product) throw new Error('PRODUCT_NOT_FOUND');
    const p = getPlaybook(product.network.slug);
    const score = Number(product.opportunityScore || 0);
    const actions: string[] = [];
    if (!product.affiliateUrl) actions.push('RESOLVE_AFFILIATE_LINK');
    if (score >= 75) actions.push('CREATE_CONTROLLED_CAMPAIGN');
    else if (score >= 55) actions.push('RUN_LOW_COST_VALIDATION');
    else actions.push('DO_NOT_SCALE');
    if ((product.contentScore || 0) < 70) actions.push('CREATE_CONTENT_VARIANTS');
    if ((product.conversionScore || 0) < 60) actions.push('IMPROVE_OFFER_OR_LANDING');
    return {
      product: { id: product.id, name: product.name, network: product.network.name, score },
      strategy: {
        objective: 'MAXIMIZE_VALIDATED_SALES',
        principles: p.principles,
        signals: p.signals,
        content: p.content,
        conversion: p.conversion,
        measurement: p.measurement,
        actions,
        guardrails: p.restrictions
      }
    };
  },

  async generatePortfolio() {
    const products = await prisma.affiliateProduct.findMany({
      where: { status: { in: ['SHORTLISTED', 'ANALYZED'] } },
      orderBy: { opportunityScore: 'desc' },
      take: 100,
      include: { network: true }
    });
    return products.map(p => ({
      productId: p.id,
      product: p.name,
      network: p.network.name,
      score: p.opportunityScore,
      affiliationStatus: p.affiliationStatus,
      nextStep: p.affiliationStatus === 'AFFILIATED' ? 'CREATE_CAMPAIGN' : 'REQUEST_OR_MANUALLY_COMPLETE_AFFILIATION',
      strategy: getPlaybook(p.network.slug)
    }));
  }
};
