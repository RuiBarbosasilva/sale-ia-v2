import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

const hashIp = (ip: string) => crypto.createHash('sha256').update(ip || 'unknown').digest('hex');

router.get('/health', (_req, res) => res.json({ success: true, module: 'affiliates', status: 'ok' }));

router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, email, phone, commissionRate, notes } = req.body || {};
    if (!name || !String(name).trim()) return res.status(400).json({ success: false, error: 'name é obrigatório' });
    const affiliate = await prisma.affiliate.create({
      data: { name: String(name).trim(), email: email || null, phone: phone || null, commissionRate: Number.isFinite(Number(commissionRate)) ? Number(commissionRate) : 10, notes: notes || null }
    });
    res.status(201).json({ success: true, affiliate });
  } catch (e: any) {
    const duplicate = String(e?.code) === 'P2002';
    res.status(duplicate ? 409 : 500).json({ success: false, error: duplicate ? 'E-mail já cadastrado' : e.message });
  }
});

router.get('/', async (_req, res) => {
  try {
    const affiliates = await prisma.affiliate.findMany({ orderBy: { createdAt: 'desc' }, include: { links: true } });
    res.json({ success: true, affiliates });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/:affiliateId/links', async (req: Request, res: Response) => {
  try {
    const { affiliateId } = req.params;
    const { destination, campaign } = req.body || {};
    if (!destination || !/^https?:\/\//i.test(destination)) return res.status(400).json({ success: false, error: 'destination HTTP/HTTPS é obrigatório' });
    const affiliate = await prisma.affiliate.findUnique({ where: { id: affiliateId } });
    if (!affiliate) return res.status(404).json({ success: false, error: 'Afiliado não encontrado' });
    if (affiliate.status !== 'ACTIVE') return res.status(400).json({ success: false, error: 'Afiliado não está ativo' });
    const code = crypto.randomBytes(6).toString('base64url');
    const link = await prisma.affiliateLink.create({ data: { affiliateId, code, destination, campaign: campaign || null } });
    res.status(201).json({ success: true, link, trackingPath: '/api/affiliates/r/' + code });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/r/:code', async (req: Request, res: Response) => {
  try {
    const link = await prisma.affiliateLink.findUnique({ where: { code: req.params.code } });
    if (!link || !link.active) return res.status(404).send('Link não encontrado');
    const affiliate = await prisma.affiliate.findUnique({ where: { id: link.affiliateId } });
    if (!affiliate || affiliate.status !== 'ACTIVE') return res.status(404).send('Link não disponível');
    await prisma.affiliateClick.create({
      data: {
        affiliateId: link.affiliateId,
        affiliateLinkId: link.id,
        ipHash: hashIp(String(req.ip || '')),
        userAgent: String(req.get('user-agent') || '').slice(0, 500),
        referrer: String(req.get('referer') || '').slice(0, 1000)
      }
    });
    return res.redirect(302, link.destination);
  } catch (e: any) { return res.status(500).send('Erro ao processar link'); }
});

router.post('/:affiliateId/sales', async (req: Request, res: Response) => {
  try {
    const { affiliateId } = req.params;
    const { affiliateLinkId, orderId, customerName, customerEmail, grossAmount, commissionRate } = req.body || {};
    const amount = Number(grossAmount);
    if (!affiliateLinkId || !Number.isFinite(amount) || amount <= 0) return res.status(400).json({ success: false, error: 'affiliateLinkId e grossAmount válidos são obrigatórios' });
    const link = await prisma.affiliateLink.findFirst({ where: { id: affiliateLinkId, affiliateId, active: true } });
    const affiliate = await prisma.affiliate.findUnique({ where: { id: affiliateId } });
    if (!link || !affiliate) return res.status(404).json({ success: false, error: 'Afiliado/link não encontrado' });
    const rate = Number.isFinite(Number(commissionRate)) ? Number(commissionRate) : affiliate.commissionRate;
    const commissionAmount = Math.round(amount * rate) / 100;
    const sale = await prisma.affiliateSale.create({
      data: { affiliateId, affiliateLinkId, orderId: orderId || null, customerName: customerName || null, customerEmail: customerEmail || null, grossAmount: amount, commissionRate: rate, commissionAmount, status: 'PENDING' }
    });
    await prisma.affiliateClick.updateMany({ where: { affiliateLinkId, converted: false }, data: { converted: true } });
    res.status(201).json({ success: true, sale });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/:affiliateId/dashboard', async (req, res) => {
  try {
    const affiliateId = req.params.affiliateId;
    const [affiliate, clicks, sales, pending] = await Promise.all([
      prisma.affiliate.findUnique({ where: { id: affiliateId } }),
      prisma.affiliateClick.count({ where: { affiliateId } }),
      prisma.affiliateSale.findMany({ where: { affiliateId }, orderBy: { createdAt: 'desc' }, take: 100 }),
      prisma.affiliateSale.aggregate({ where: { affiliateId, status: 'PENDING' }, _sum: { commissionAmount: true } })
    ]);
    if (!affiliate) return res.status(404).json({ success: false, error: 'Afiliado não encontrado' });
    const approved = sales.filter(s => s.status === 'APPROVED' || s.status === 'PAID').reduce((n, s) => n + s.commissionAmount, 0);
    res.json({ success: true, affiliate, metrics: { clicks, sales: sales.length, conversionRate: clicks ? sales.length / clicks : 0, pendingCommission: pending._sum.commissionAmount || 0, approvedCommission: approved }, sales });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/sales/:saleId/approve', async (req, res) => {
  try {
    const sale = await prisma.affiliateSale.update({ where: { id: req.params.saleId }, data: { status: 'APPROVED', approvedAt: new Date() } });
    res.json({ success: true, sale });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/sales/:saleId/cancel', async (req, res) => {
  try {
    const sale = await prisma.affiliateSale.update({ where: { id: req.params.saleId }, data: { status: 'CANCELLED' } });
    res.json({ success: true, sale });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

router.post('/:affiliateId/payouts', async (req, res) => {
  try {
    const amount = Number(req.body?.amount);
    if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ success: false, error: 'amount inválido' });
    const payout = await prisma.affiliatePayout.create({ data: { affiliateId: req.params.affiliateId, amount, status: 'PENDING', method: req.body?.method || null, reference: req.body?.reference || null } });
    res.status(201).json({ success: true, payout });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

router.get('/stats/overview', async (_req, res) => {
  try {
    const [affiliates, clicks, sales, commissions] = await Promise.all([
      prisma.affiliate.count({ where: { status: 'ACTIVE' } }),
      prisma.affiliateClick.count(),
      prisma.affiliateSale.count({ where: { status: { not: 'CANCELLED' } } }),
      prisma.affiliateSale.aggregate({ where: { status: { in: ['APPROVED', 'PAID'] } }, _sum: { commissionAmount: true, grossAmount: true } })
    ]);
    res.json({ success: true, stats: { activeAffiliates: affiliates, clicks, sales, grossSales: commissions._sum.grossAmount || 0, commissionsPaidOrApproved: commissions._sum.commissionAmount || 0 } });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

export default router;
