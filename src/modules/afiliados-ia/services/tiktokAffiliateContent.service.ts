export interface TikTokAffiliateBrief {
  productName: string;
  category?: string;
  description?: string;
  affiliateUrl: string;
  durationSeconds?: number;
}

export interface TikTokAffiliatePackage {
  platform: 'tiktok';
  productName: string;
  durationSeconds: number;
  hook: string;
  scenes: Array<{ seconds: string; visual: string; voiceover: string; overlay: string }>;
  caption: string;
  hashtags: string[];
  callToAction: string;
  affiliateDisclosure: string;
  affiliateUrl: string;
  publicationMode: 'DRAFT_REQUIRES_HUMAN_REVIEW';
  validationNotes: string[];
}

const clean = (value: unknown, max: number): string =>
  typeof value === 'string' ? value.trim().replace(/[\u0000-\u001f\u007f]/g, '').slice(0, max) : '';

export function generateTikTokAffiliatePackage(input: TikTokAffiliateBrief): TikTokAffiliatePackage {
  const productName = clean(input?.productName, 120);
  const category = clean(input?.category, 80) || 'produto';
  const description = clean(input?.description, 500);
  const rawUrl = clean(input?.affiliateUrl, 2048);
  const durationSeconds = Number(input?.durationSeconds ?? 20);

  if (!productName) throw new Error('TIKTOK_PRODUCT_NAME_REQUIRED');
  if (!rawUrl) throw new Error('TIKTOK_AFFILIATE_URL_REQUIRED');
  if (!Number.isInteger(durationSeconds) || durationSeconds < 15 || durationSeconds > 60) {
    throw new Error('TIKTOK_DURATION_INVALID');
  }

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error('TIKTOK_AFFILIATE_URL_INVALID');
  }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('TIKTOK_AFFILIATE_URL_INVALID');
  }

  const hook = 'Você está procurando uma opção de ' + category + '? Veja isto antes de decidir.';
  const productContext = description
    ? 'Apresente somente os detalhes informados: ' + description
    : 'Mostre o produto e explique suas características verificadas, sem prometer resultados.';
  const scenes = [
    {
      seconds: '0–3s',
      visual: 'Plano próximo do produto; enquadramento vertical 9:16.',
      voiceover: hook,
      overlay: 'Vale conhecer esta opção?'
    },
    {
      seconds: '3–' + Math.floor(durationSeconds * 0.65) + 's',
      visual: 'Demonstração real do produto em uso; mostrar detalhes sem simular resultados.',
      voiceover: productContext,
      overlay: 'Confira os detalhes'
    },
    {
      seconds: Math.floor(durationSeconds * 0.65) + '–' + durationSeconds + 's',
      visual: 'Mostrar embalagem ou produto completo e encerrar com CTA clara.',
      voiceover: 'Compare as informações e as condições da oferta no link.',
      overlay: 'Link da oferta na descrição'
    }
  ];

  return {
    platform: 'tiktok',
    productName,
    durationSeconds,
    hook,
    scenes,
    caption: 'Conheça ' + productName + '. Confira os detalhes e compare as condições antes de comprar.',
    hashtags: ['#TikTokMeFezComprar', '#Achadinhos', '#DicaDeCompra', '#' + category.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 32)],
    callToAction: 'Acesse o link de afiliado e confira preço, disponibilidade e condições atualizadas.',
    affiliateDisclosure: 'Publicidade / link de afiliado: posso receber comissão por compras qualificadas, sem custo adicional para você.',
    affiliateUrl: url.toString(),
    publicationMode: 'DRAFT_REQUIRES_HUMAN_REVIEW',
    validationNotes: [
      'Rascunho gerado; nenhuma publicação foi enviada ao TikTok.',
      'Confirme que o link pertence à sua conta e está autorizado pelo programa de afiliados.',
      'Use apenas imagens, música e vídeos com direitos de uso; não invente avaliações, vendas ou resultados.',
      'Revise as regras vigentes do TikTok e identifique claramente o conteúdo comercial.'
    ]
  };
}
