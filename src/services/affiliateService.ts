import crypto from 'crypto';
import { prisma } from '../modules/mercadoLivre/lib/prisma';

const TOKEN_BYTES = 32;
const AFFILIATE_STATUSES = ['PENDING', 'ACTIVE', 'BLOCKED'] as const;
const SALE_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'PAID'] as const;
const PAYOUT_STATUSES = ['REQUESTED', 'PROCESSING', 'PAID', 'REJECTED'] as const;

type SaleStatus = typeof SALE_STATUSES[number];
type PayoutStatus = typeof PAYOUT_STATUSES[number];

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

function safeAffiliate(a: any) {
  if (!a) return a;
  return publicAffiliate(a);
}

function finiteNumber(value: unknown, fallback?: number) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function assertRate(rate: number) {
  if (!Number.isFinite(rate) || rate < 0 || rate > 100) throw new Error('INVALID_COMMISSION_RATE');
}

function assertStatus<T extends readonly string[]>(value: unknown, allowed: T, error: string): asserts value is T[number] {
  if (!allowed.includes(value as T[number])) throw new Error(error);
}

function assertSaleTransition(from: SaleStatus, to: SaleStatus) {
  if (from === to) return;
  const allowed: Record<SaleStatus, SaleStatus[]> = {
    PENDING: ['APPROVED', 'REJECTED'],
    APPROVED: ['REJECTED', 'PAID'],
    REJECTED: [],
    PAID: [],
  };
  if (!allowed[from].includes(to)) throw new Error('INVALID_SALE_STATUS_TRANSITION');
}

function assertPayoutTransition(from: PayoutStatus, to: PayoutStatus) {
  if (from === to) return;
  const allowed: Record<PayoutStatus, PayoutStatus[]> = {
    REQUESTED: ['PROCESSING', 'PAID', 'REJECTED'],
    PROCESSING: ['PAID', 'REJECTED'],
    PAID: [],
    REJECTED: [],
  };
  if (!allowed[from].includes(to)) throw new Error('INVALID_PAYOUT_STATUS_TRANSITION');
}

export const affiliateService = {
  async register(input: { name: string; email: string; phone?: string }) {
    const name = String(input.name || '').trim();
    const email = normalizeEmail(String(input.email || ''));
    if (name.length < 2 || !email.includes('@')) throw new Error('NAME_AND_EMAIL_REQUIRED');

    const existing = await prisma.affiliate.findUnique({ where: { email } });
    if (existing) throw new Error('AFFILIATE_EMAIL_EXISTS');

    const token = newToken();
    const affiliate = await prisma.affiliate.create({
      data: {
        name,
        email,
        phone: input.phone?.trim() || null,
        slug: makeCode(name),
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

  async rotateAccessToken(id: string) {
    const affiliate = await prisma.affiliate.findUnique({ where: { id } });
    if (!affiliate) throw new Error('AFFILIATE_NOT_FOUND');
    const token = newToken();
    await prisma.affiliate.update({ where: { id }, data: { accessTokenHash: hashToken(token) } });
    return { accessToken: token };
  },

  async list() {
    const affiliates = await prisma.affiliate.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { links: true, clicks: true, sales: true, payouts: true } } },
    });
    return affiliates.map(safeAffiliate);
  },

  async get(id: string) {
    const affiliate = await prisma.affiliate.findUnique({
      where: { id },
      include: {
        links: { orderBy: { createdAt: 'desc' }, include: { offer: true } },
        sales: { orderBy: { createdAt: 'desc' }, take: 100 },
        payouts: { orderBy: { requestedAt: 'desc' }, take: 100, include: { items: true } },
      },
    });
    if (!affiliate) throw new Error('AFFILIATE_NOT_FOUND');
    return {
      ...safeAffiliate(affiliate),
      links: affiliate.links,
      sales: affiliate.sales,
      payouts: affiliate.payouts,
    };
  },

  async update(id: string, data: { status?: string; commissionRate?: number; notes?: string }) {
    const current = await prisma.affiliate.findUnique({ where: { id } });
    if (!current) throw new Error('AFFILIATE_NOT_FOUND');

    if (data.status !== undefined) assertStatus(data.status, AFFILIATE_STATUSES, 'INVALID_AFFILIATE_STATUS');
    if (data.commissionRate !== undefined) assertRate(Number(data.commissionRate));

    return prisma.affiliate.update({
      where: { id },
      data: {
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.commissionRate !== undefined ? { commissionRate: Number(data.commissionRate) } : {}),
        ...(data.notes !== undefined ? { notes: String(data.notes).trim() || null } : {}),
      },
    }).then(safeAffiliate);
  },

  async createOffer(data: { name: string; network?: string; externalId?: string; destinationUrl: string; category?: string; commissionRate?: number; metadata?: unknown }) {
    const name = String(data.name || '').trim();
    if (!name) throw new Error('OFFER_NAME_REQUIRED');
    if (!/^https?:\/\//i.test(data.destinationUrl)) throw new Error('INVALID_DESTINATION_URL');
    const rate = finiteNumber(data.commissionRate, 10)!;
    assertRate(rate);

    return prisma.affiliateOffer.create({
      data: {
        name,
        network: data.network?.trim() || null,
        externalId: data.externalId?.trim() || null,
        destinationUrl: data.destinationUrl,
        category: data.category?.trim() || null,
        commissionRate: rate,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      },
    });
  },

  async listOffers(activeOnly = false) {
    return prisma.affiliateOffer.findMany({
      where: activeOnly ? { active: true } : undefined,
      orderBy: [{ active: 'desc' }, { createdAt: 'desc' }],
    });
  },

  async updateOffer(id: string, data: { name?: string; destinationUrl?: string; category?: string; commissionRate?: number; active?: boolean; metadata?: unknown }) {
    const current = await prisma.affiliateOffer.findUnique({ where: { id } });
    if (!current) throw new Error('OFFER_NOT_FOUND');
    if (data.destinationUrl !== undefined && !/^https?:\/\//i.test(data.destinationUrl)) throw new Error('INVALID_DESTINATION_URL');
    if (data.commissionRate !== undefined) assertRate(Number(data.commissionRate));

    return prisma.affiliateOffer.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: String(data.name).trim() } : {}),
        ...(data.destinationUrl !== undefined ? { destinationUrl: data.destinationUrl } : {}),
        ...(data.category !== undefined ? { category: String(data.category).trim() || null } : {}),
        ...(data.commissionRate !== undefined ? { commissionRate: Number(data.commissionRate) } : {}),
        ...(data.active !== undefined ? { active: Boolean(data.active) } : {}),
        ...(data.metadata !== undefined ? { metadata: data.metadata ? JSON.stringify(data.metadata) : null } : {}),
      },
    });
  },

  async createLink(affiliateId: string, data: { destinationUrl?: string; offerId?: string; campaign?: string; code?: string }) {
    const affiliate = await prisma.affiliate.findUnique({ where: { id: affiliateId } });
    if (!affiliate) throw new Error('AFFILIATE_NOT_FOUND');
    if (affiliate.status === 'BLOCKED') throw new Error('AFFILIATE_BLOCKED');

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

  async updateLink(id: string, data: { active?: boolean; destinationUrl?: string; campaign?: string }) {
    const current = await prisma.affiliateLink.findUnique({ where: { id } });
    if (!current) throw new Error('LINK_NOT_FOUND');
    if (data.destinationUrl !== undefined && !/^https?:\/\//i.test(data.destinationUrl)) throw new Error('INVALID_DESTINATION_URL');
    return prisma.affiliateLink.update({
      where: { id },
      data: {
        ...(data.active !== undefined ? { active: Boolean(data.active) } : {}),
        ...(data.destinationUrl !== undefined ? { destinationUrl: data.destinationUrl } : {}),
        ...(data.campaign !== undefined ? { campaign: String(data.campaign).trim() || null } : {}),
      },
      include: { offer: true },
    });
  },

  async listLinks(affiliateId?: string) {
    const links = await prisma.affiliateLink.findMany({
      where: affiliateId ? { affiliateId } : undefined,
      include: { affiliate: true, offer: true, _count: { select: { clicks: true, sales: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return links.map((link) => ({
      ...link,
      affiliate: safeAffiliate(link.affiliate),
    }));
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
      prisma.affiliateLink.update({ where: { id: link.id }, data: { clickCount: { increment: 1 } } }),
    ]);
    return { destinationUrl: link.destinationUrl };
  },

  async recordSale(input: { affiliateId?: string; linkCode?: string; externalOrderId?: string; webhookEventId?: string; amount: number; commissionRate?: number; source?: string; customerRef?: string; metadata?: unknown }) {
    if (input.webhookEventId) {
      const existing = await prisma.affiliateSale.findUnique({ where: { webhookEventId: input.webhookEventId } });
      if (existing) return existing;
    }
    if (input.externalOrderId) {
      const existing = await prisma.affiliateSale.findUnique({ where: { externalOrderId: input.externalOrderId } });
      if (existing) return existing;
    }

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
    if (affiliate.status === 'BLOCKED') throw new Error('AFFILIATE_BLOCKED');

    const rate = finiteNumber(input.commissionRate, defaultRate)!;
    assertRate(rate);
    const amount = Number(input.amount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 100000000) throw new Error('INVALID_SALE_AMOUNT');

    const commissionAmount = Number((amount * rate / 100).toFixed(2));
    try {
      return await prisma.affiliateSale.create({
        data: {
          affiliateId,
          linkId,
          externalOrderId: input.externalOrderId || null,
          webhookEventId: input.webhookEventId || null,
          source: input.source || 'MANUAL',
          customerRef: input.customerRef || null,
          amount: Number(amount.toFixed(2)),
          commissionRate: rate,
          commissionAmount,
          status: 'PENDING',
          metadata: input.metadata ? JSON.stringify(input.metadata) : null,
        },
      });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        if (input.webhookEventId) {
          const existing = await prisma.affiliateSale.findUnique({ where: { webhookEventId: input.webhookEventId } });
          if (existing) return existing;
        }
        if (input.externalOrderId) {
          const existing = await prisma.affiliateSale.findUnique({ where: { externalOrderId: input.externalOrderId } });
          if (existing) return existing;
        }
      }
      throw error;
    }
  },

  async listSales(filters: { affiliateId?: string; status?: string; source?: string; take?: number } = {}) {
    const where: any = {
      ...(filters.affiliateId ? { affiliateId: filters.affiliateId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.source ? { source: filters.source } : {}),
    };
    const sales = await prisma.affiliateSale.findMany({
      where,
      include: { affiliate: true, link: true, payoutItems: { include: { payout: true } } },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(Number(filters.take || 100), 1), 500),
    });
    return sales.map((sale) => ({
      ...sale,
      affiliate: safeAffiliate(sale.affiliate),
    }));
  },

  async setSaleStatus(id: string, status: SaleStatus) {
    assertStatus(status, SALE_STATUSES, 'INVALID_SALE_STATUS');
    const sale = await prisma.affiliateSale.findUnique({ where: { id } });
    if (!sale) throw new Error('SALE_NOT_FOUND');
    assertSaleTransition(sale.status as SaleStatus, status);

    if (status === 'PAID') {
      const openAllocation = await prisma.affiliatePayoutItem.findFirst({
        where: { saleId: id, payout: { status: { in: ['REQUESTED', 'PROCESSING'] } } },
      });
      if (openAllocation) throw new Error('SALE_ALLOCATED_TO_OPEN_PAYOUT');
    }

    return prisma.affiliateSale.update({
      where: { id },
      data: {
        status,
        ...(status === 'APPROVED' ? { approvedAt: sale.approvedAt || new Date() } : {}),
        ...(status === 'PAID' ? { paidAt: sale.paidAt || new Date() } : {}),
      },
    });
  },

  async requestPayout(affiliateId: string, method?: string) {
    return prisma.$transaction(async (tx) => {
      const affiliate = await tx.affiliate.findUnique({ where: { id: affiliateId } });
      if (!affiliate) throw new Error('AFFILIATE_NOT_FOUND');
      if (affiliate.status === 'BLOCKED') throw new Error('AFFILIATE_BLOCKED');

      const approvedSales = await tx.affiliateSale.findMany({
        where: {
          affiliateId,
          status: 'APPROVED',
          payoutItems: { none: { payout: { status: { in: ['REQUESTED', 'PROCESSING'] } } } },
        },
        orderBy: { approvedAt: 'asc' },
        select: { id: true, commissionAmount: true },
      });

      const available = approvedSales.reduce((sum, sale) => sum + Number(sale.commissionAmount || 0), 0);
      if (available <= 0) throw new Error('NO_AVAILABLE_BALANCE');

      return tx.affiliatePayout.create({
        data: {
          affiliateId,
          amount: Number(available.toFixed(2)),
          method: method?.trim() || null,
          status: 'REQUESTED',
          items: {
            create: approvedSales.map((sale) => ({
              saleId: sale.id,
              amount: Number(Number(sale.commissionAmount || 0).toFixed(2)),
            })),
          },
        },
        include: { items: true },
      });
    });
  },

  async setPayoutStatus(id: string, status: PayoutStatus, reference?: string, notes?: string) {
    assertStatus(status, PAYOUT_STATUSES, 'INVALID_PAYOUT_STATUS');
    const payout = await prisma.affiliatePayout.findUnique({
      where: { id },
      include: { items: { include: { sale: true } } },
    });
    if (!payout) throw new Error('PAYOUT_NOT_FOUND');
    assertPayoutTransition(payout.status as PayoutStatus, status);

    if (status === 'PAID') {
      if (!payout.items.length) throw new Error('PAYOUT_WITHOUT_ITEMS');
      const invalid = payout.items.some((item) => item.sale.status !== 'APPROVED');
      if (invalid) throw new Error('PAYOUT_SALES_NOT_AVAILABLE');
      const total = Number(payout.items.reduce((sum, item) => sum + Number(item.amount || 0), 0).toFixed(2));
      if (Math.abs(total - Number(payout.amount)) > 0.01) throw new Error('PAYOUT_AMOUNT_MISMATCH');
    }

    return prisma.$transaction(async (tx) => {
      const now = new Date();
      const result = await tx.affiliatePayout.update({
        where: { id },
        data: {
          status,
          reference: reference?.trim() || payout.reference,
          notes: notes !== undefined ? (notes.trim() || null) : payout.notes,
          ...(status === 'PAID' ? { paidAt: payout.paidAt || now } : {}),
        },
        include: { items: true },
      });

      if (status === 'PAID') {
        const saleIds = payout.items.map((item) => item.saleId);
        const changed = await tx.affiliateSale.updateMany({
          where: { id: { in: saleIds }, affiliateId: payout.affiliateId, status: 'APPROVED' },
          data: { status: 'PAID', paidAt: now },
        });
        if (changed.count !== saleIds.length) throw new Error('PAYOUT_SALES_CHANGED');
      }

      return result;
    });
  },

  async listPayouts(filters: { affiliateId?: string; status?: string } = {}) {
    const payouts = await prisma.affiliatePayout.findMany({
      where: {
        ...(filters.affiliateId ? { affiliateId: filters.affiliateId } : {}),
        ...(filters.status ? { status: filters.status } : {}),
      },
      include: { affiliate: true, items: { include: { sale: true } } },
      orderBy: { requestedAt: 'desc' },
      take: 500,
    });
    return payouts.map((payout) => ({
      ...payout,
      affiliate: safeAffiliate(payout.affiliate),
    }));
  },

  async dashboard(affiliateId: string) {
    const [affiliate, clicks, sales, approved, pending, paid, payouts, recentSales, recentPayouts] = await Promise.all([
      prisma.affiliate.findUnique({ where: { id: affiliateId } }),
      prisma.affiliateClick.count({ where: { affiliateId } }),
      prisma.affiliateSale.aggregate({ where: { affiliateId }, _sum: { amount: true, commissionAmount: true }, _count: true }),
      prisma.affiliateSale.aggregate({
        where: { affiliateId, status: 'APPROVED', payoutItems: { none: { payout: { status: { in: ['REQUESTED', 'PROCESSING'] } } } } },
        _sum: { commissionAmount: true },
      }),
      prisma.affiliateSale.aggregate({ where: { affiliateId, status: 'PENDING' }, _sum: { commissionAmount: true } }),
      prisma.affiliateSale.aggregate({ where: { affiliateId, status: 'PAID' }, _sum: { commissionAmount: true } }),
      prisma.affiliatePayout.aggregate({ where: { affiliateId, status: { in: ['REQUESTED', 'PROCESSING'] } }, _sum: { amount: true } }),
      prisma.affiliateSale.findMany({ where: { affiliateId }, orderBy: { createdAt: 'desc' }, take: 20 }),
      prisma.affiliatePayout.findMany({ where: { affiliateId }, orderBy: { requestedAt: 'desc' }, take: 20, include: { items: true } }),
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
      recentSales,
      recentPayouts,
    };
  },

  async adminStats() {
    const [affiliates, activeAffiliates, links, clicks, sales, pending, approved, paid, payouts] = await Promise.all([
      prisma.affiliate.count(),
      prisma.affiliate.count({ where: { status: 'ACTIVE' } }),
      prisma.affiliateLink.count({ where: { active: true } }),
      prisma.affiliateClick.count(),
      prisma.affiliateSale.aggregate({ _sum: { amount: true, commissionAmount: true }, _count: true }),
      prisma.affiliateSale.aggregate({ where: { status: 'PENDING' }, _sum: { commissionAmount: true } }),
      prisma.affiliateSale.aggregate({
        where: { status: 'APPROVED', payoutItems: { none: { payout: { status: { in: ['REQUESTED', 'PROCESSING'] } } } } },
        _sum: { commissionAmount: true },
      }),
      prisma.affiliateSale.aggregate({ where: { status: 'PAID' }, _sum: { commissionAmount: true } }),
      prisma.affiliatePayout.aggregate({ where: { status: { in: ['REQUESTED', 'PROCESSING'] } }, _sum: { amount: true } }),
    ]);
    return {
      affiliates,
      activeAffiliates,
      activeLinks: links,
      clicks,
      sales: sales._count,
      salesValue: Number(sales._sum.amount || 0),
      commissions: Number(sales._sum.commissionAmount || 0),
      pendingCommission: Number(pending._sum.commissionAmount || 0),
      approvedCommission: Number(approved._sum.commissionAmount || 0),
      paidCommission: Number(paid._sum.commissionAmount || 0),
      payoutsOpen: Number(payouts._sum.amount || 0),
    };
  },
};
