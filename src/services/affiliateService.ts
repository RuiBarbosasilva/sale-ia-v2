import crypto from 'crypto';
import { prisma } from '../modules/mercadoLivre/lib/prisma';

const TOKEN_BYTES = 32;

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function makeCode(seed: string) {
  const base = seed.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24) || 'afiliado';
  return `${base}-${crypto.randomBytes(4).toString('hex')}`;
}

function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function newToken() {
  return crypto.randomBytes(TOKEN_BYTES).toString('hex');
}

function publicAffiliate(a: any) {
  const { accessTokenHash, ...safe } = a;
  return safe;
}

export const affiliateService = {
  async register(input: { name: string; email: string; phone?: string }) {
    const email = normalizeEmail(input.email);
    const existing = await prisma.affiliate.findUnique({ where: { email } });
    if (existing) throw new Error('AFFILIATE_EMAIL_EXISTS');

    const token = newToken();
    const affiliate = await prisma.affiliate.create({
      data: {
        name: input.name.trim(),
        email,
        phone: input.phone?.trim() || null,
        slug: makeCode(input.name),
        status: 'PENDING',
        accessTokenHash: hashToken(token),
      },
    });
    return { affiliate: publicAffiliate(affiliate), accessToken: token };
  },

  async authenticate(token: string) {
    if (!token) throw new Error('AFFILIATE_TOKEN_REQUIRED');
    const affiliate = await prisma.affiliate.findUnique({ where: { accessTokenHash: hashToken(token) } });
    if (!affiliate || affiliate.status === 'BLOCKED') throw new Error('AFFILIATE_UNAUTHORIZED');
    await prisma.affiliate.update({ where: { id: affiliate.id }, data: { lastLoginAt: new Date() } });
    return affiliate;
  },

  async list() {
    return prisma.affiliate.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { links: true, clicks: true, sales: true, payouts: true } },
      },
    });
  },

  async get(id: string) {
    const affiliate = await prisma.affiliate.findUnique({
      where: { id },
      include: {
        links: { orderBy: { createdAt: 'desc' }, include: { offer: true } },
        sales: { orderBy: { createdAt: 'desc' }, take: 100 },
        payouts: { orderBy: { requestedAt: 'desc' }, take: 100 },
      },
    });
    if (!affiliate) throw new Error('AFFILIATE_NOT_FOUND');
    return affiliate;
  },

  async update(id: string, data: { status?: string; commissionRate?: number; notes?: string }) {
    return prisma.affiliate.update({
      where: { id },
      data: {
        status: data.status,
        commissionRate: data.commissionRate,
        notes: data.notes,
      },
    });
  },

  async createOffer(data: { name: string; network?: string; externalId?: string; destinationUrl: string; category?: string; commissionRate?: number; metadata?: unknown }) {
    if (!/^https?:\/\//i.test(data.destinationUrl)) throw new Error('INVALID_DESTINATION_URL');
    return prisma.affiliateOffer.create({
      data: {
        name: data.name.trim(),
        network: data.network?.trim() || null,
        externalId: data.externalId?.trim() || null,
        destinationUrl: data.destinationUrl,
        category: data.category?.trim() || null,
        commissionRate: Number.isFinite(data.commissionRate) ? Number(data.commissionRate) : 10,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      },
    });
  },

  async listOffers() {
    return prisma.affiliateOffer.findMany({ orderBy: [{ active: 'desc' }, { createdAt: 'desc' }] });
  },

  async createLink(affiliateId: string, data: { destinationUrl?: string; offerId?: string; campaign?: string; code?: string }) {
    const affiliate = await prisma.affiliate.findUnique({ where: { id: affiliateId } });
    if (!affiliate) throw new Error('AFFILIATE_NOT_FOUND');

    let destinationUrl = data.destinationUrl;
    if (data.offerId) {
      const offer = await prisma.affiliateOffer.findUnique({ where: { id: data.offerId } });
      if (!offer || !offer.active) throw new Error('OFFER_NOT_FOUND');
      destinationUrl = destinationUrl || offer.destinationUrl;
    }
    if (!destinationUrl || !/^https?:\/\//i.test(destinationUrl)) throw new Error('INVALID_DESTINATION_URL');

    const code = data.code?.trim() || makeCode(affiliate.slug);
    const existing = await prisma.affiliateLink.findUnique({ where: { code } });
    if (existing) throw new Error('LINK_CODE_EXISTS');

    return prisma.affiliateLink.create({
      data: {
        affiliateId,
        offerId: data.offerId || null,
        code,
        destinationUrl,
        campaign: data.campaign?.trim() || null,
      },
      include: { offer: true },
    });
  },

  async listLinks(affiliateId?: string) {
    return prisma.affiliateLink.findMany({
      where: affiliateId ? { affiliateId } : undefined,
      include: { affiliate: true, offer: true, _count: { select: { clicks: true, sales: true } } },
      orderBy: { createdAt: 'desc' },
    });
  },

  async trackClick(code: string, meta: { ip?: string; userAgent?: string; referer?: string }) {
    const link = await prisma.affiliateLink.findUnique({ where: { code } });
    if (!link || !link.active) throw new Error('LINK_NOT_FOUND');

    const ipHash = meta.ip ? hashToken(meta.ip) : null;
    await prisma.$transaction([
      prisma.affiliateClick.create({
        data: {
          affiliateId: link.affiliateId,
          linkId: link.id,
          ipHash,
          userAgent: meta.userAgent?.slice(0, 1000) || null,
          referer: meta.referer?.slice(0, 1000) || null,
        },
      }),
      prisma.affiliateLink.update({
        where: { id: link.id },
        data: { clickCount: { increment: 1 } },
      }),
    ]);
    return { destinationUrl: link.destinationUrl };
  },

  async recordSale(input: { affiliateId?: string; linkCode?: string; externalOrderId?: string; amount: number; commissionRate?: number; source?: string; customerRef?: string; metadata?: unknown }) {
    let affiliateId = input.affiliateId;
    let linkId: string | null = null;
    let defaultRate = 10;

    if (input.linkCode) {
      const link = await prisma.affiliateLink.findUnique({ where: { code: input.linkCode }, include: { affiliate: true, offer: true } });
      if (!link) throw new Error('LINK_NOT_FOUND');
      affiliateId = link.affiliateId;
      linkId = link.id;
      defaultRate = link.offer?.commissionRate ?? link.affiliate.commissionRate;
    }
    if (!affiliateId) throw new Error('AFFILIATE_REQUIRED');

    const affiliate = await prisma.affiliate.findUnique({ where: { id: affiliateId } });
    if (!affiliate) throw new Error('AFFILIATE_NOT_FOUND');
    const rate = Number.isFinite(input.commissionRate) ? Number(input.commissionRate) : defaultRate;
    const amount = Number(input.amount);
    if (!Number.isFinite(amount) || amount <= 0) throw new Error('INVALID_SALE_AMOUNT');

    const commissionAmount = Number((amount * rate / 100).toFixed(2));
    return prisma.affiliateSale.create({
      data: {
        affiliateId,
        linkId,
        externalOrderId: input.externalOrderId || null,
        source: input.source || 'MANUAL',
        customerRef: input.customerRef || null,
        amount,
        commissionRate: rate,
        commissionAmount,
        status: 'PENDING',
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      },
    });
  },

  async setPayoutStatus(id: string, status: 'PROCESSING' | 'PAID' | 'REJECTED', reference?: string) {
    const payout = await prisma.affiliatePayout.findUnique({ where: { id } });
    if (!payout) throw new Error('PAYOUT_NOT_FOUND');
    const data: any = { status, reference: reference || payout.reference };
    if (status === 'PAID') data.paidAt = new Date();
    return prisma.affiliatePayout.update({ where: { id }, data });
  },

  async setSaleStatus(id: string, status: 'APPROVED' | 'REJECTED' | 'PAID') {
    const sale = await prisma.affiliateSale.findUnique({ where: { id } });
    if (!sale) throw new Error('SALE_NOT_FOUND');
    const data: any = { status };
    if (status === 'APPROVED') data.approvedAt = new Date();
    if (status === 'PAID') data.paidAt = new Date();
    return prisma.affiliateSale.update({ where: { id }, data });
  },

  async requestPayout(affiliateId: string, method?: string) {
    const agg = await prisma.affiliateSale.aggregate({
      where: { affiliateId, status: 'APPROVED' },
      _sum: { commissionAmount: true },
    });
    const alreadyRequested = await prisma.affiliatePayout.aggregate({
      where: { affiliateId, status: { in: ['REQUESTED', 'PROCESSING', 'PAID'] } },
      _sum: { amount: true },
    });
    const available = Number(agg._sum.commissionAmount || 0) - Number(alreadyRequested._sum.amount || 0);
    if (available <= 0) throw new Error('NO_AVAILABLE_BALANCE');

    return prisma.affiliatePayout.create({
      data: { affiliateId, amount: Number(available.toFixed(2)), method: method || null, status: 'REQUESTED' },
    });
  },

  async dashboard(affiliateId: string) {
    const [affiliate, clicks, sales, approved, pending, paid, payouts] = await Promise.all([
      prisma.affiliate.findUnique({ where: { id: affiliateId } }),
      prisma.affiliateClick.count({ where: { affiliateId } }),
      prisma.affiliateSale.aggregate({ where: { affiliateId }, _sum: { amount: true, commissionAmount: true }, _count: true }),
      prisma.affiliateSale.aggregate({ where: { affiliateId, status: 'APPROVED' }, _sum: { commissionAmount: true } }),
      prisma.affiliateSale.aggregate({ where: { affiliateId, status: 'PENDING' }, _sum: { commissionAmount: true } }),
      prisma.affiliateSale.aggregate({ where: { affiliateId, status: 'PAID' }, _sum: { commissionAmount: true } }),
      prisma.affiliatePayout.aggregate({ where: { affiliateId, status: { in: ['REQUESTED', 'PROCESSING'] } }, _sum: { amount: true } }),
    ]);
    if (!affiliate) throw new Error('AFFILIATE_NOT_FOUND');
    return {
      affiliate: publicAffiliate(affiliate),
      metrics: {
        clicks,
        sales: sales._count,
        salesValue: Number(sales._sum.amount || 0),
        commissions: Number(sales._sum.commissionAmount || 0),
        approvedBalance: Number(approved._sum.commissionAmount || 0),
        pendingCommission: Number(pending._sum.commissionAmount || 0),
        paidCommission: Number(paid._sum.commissionAmount || 0),
        payoutInProgress: Number(payouts._sum.amount || 0),
      },
    };
  },

  async adminStats() {
    const [affiliates, links, clicks, sales, pending, approved, paid, payouts] = await Promise.all([
      prisma.affiliate.count(),
      prisma.affiliateLink.count({ where: { active: true } }),
      prisma.affiliateClick.count(),
      prisma.affiliateSale.aggregate({ _sum: { amount: true, commissionAmount: true }, _count: true }),
      prisma.affiliateSale.aggregate({ where: { status: 'PENDING' }, _sum: { commissionAmount: true } }),
      prisma.affiliateSale.aggregate({ where: { status: 'APPROVED' }, _sum: { commissionAmount: true } }),
      prisma.affiliateSale.aggregate({ where: { status: 'PAID' }, _sum: { commissionAmount: true } }),
      prisma.affiliatePayout.aggregate({ where: { status: { in: ['REQUESTED', 'PROCESSING'] } }, _sum: { amount: true } }),
    ]);
    return {
      affiliates, activeLinks: links, clicks,
      sales: sales._count, salesValue: Number(sales._sum.amount || 0),
      commissions: Number(sales._sum.commissionAmount || 0),
      pendingCommission: Number(pending._sum.commissionAmount || 0),
      approvedCommission: Number(approved._sum.commissionAmount || 0),
      paidCommission: Number(paid._sum.commissionAmount || 0),
      payoutsOpen: Number(payouts._sum.amount || 0),
    };
  },
};
