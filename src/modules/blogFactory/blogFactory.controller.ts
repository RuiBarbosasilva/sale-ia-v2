import { Request, Response } from 'express';
import * as service from './blogFactory.service';

function authorized(req: Request, res: Response): boolean {
  const expected = process.env.SALE_IA_ADMIN_KEY || process.env.AFFILIATE_ADMIN_KEY;
  if (!expected) { res.status(503).json({ success: false, error: 'ADMIN_KEY_NOT_CONFIGURED' }); return false; }
  if (req.header('x-sale-ia-admin-key') !== expected) { res.status(401).json({ success: false, error: 'UNAUTHORIZED' }); return false; }
  return true;
}

function fail(res: Response, error: unknown) {
  const message = error instanceof Error ? error.message : 'INTERNAL_ERROR';
  let status = 500;
  if (message.endsWith('_NOT_FOUND')) status = 404;
  else if (message.startsWith('QUALITY_GATE_') || message.startsWith('PUBLISHING_DISABLED') ||
    message.startsWith('PUBLISHED_') || message.startsWith('ARTICLE_ALREADY') ||
    message.startsWith('HUMAN_APPROVAL') || message.startsWith('TOPIC_ALREADY') || message.startsWith('ARTICLE_ALREADY_SENT') || message.startsWith('ARTICLE_PUBLISH_IN_PROGRESS') || message === 'NO_VALID_FIELDS') status = 409;
  else if (message.startsWith('AI_PROVIDER_') || message.startsWith('WORDPRESS_NOT_CONFIGURED') ||
    message.startsWith('WORDPRESS_HTTP_') || message.startsWith('WORDPRESS_LOOKUP_HTTP_') || message === 'WORDPRESS_INVALID_URL' || message === 'BLOG_FACTORY_FEEDS_NOT_CONFIGURED') status = 503;
  return res.status(status).json({ success: false, error: message });
}

export async function health(_req: Request, res: Response) {
  try { return res.json({ success: true, ...(await service.getStatus()) }); }
  catch { return res.status(503).json({ success: false, module: 'blog-factory-ia', status: 'DEGRADED', reason: 'DATABASE_UNAVAILABLE' }); }
}
export async function status(req: Request, res: Response) {
  if (!authorized(req, res)) return;
  try { return res.json({ success: true, ...(await service.getStatus()) }); } catch (e) { return fail(res, e); }
}
export async function runCycle(req: Request, res: Response) {
  if (!authorized(req, res)) return;
  try { return res.json({ success: true, ...(await service.runAutomationCycle()) }); } catch (e) { return fail(res, e); }
}
export async function generateArticle(req: Request, res: Response) {
  if (!authorized(req, res)) return;
  try { return res.status(201).json({ success: true, item: await service.generateArticle(req.params.id) }); } catch (e) { return fail(res, e); }
}
export async function research(req: Request, res: Response) {
  if (!authorized(req, res)) return;
  try { return res.json({ success: true, ...(await service.discoverTrends()) }); } catch (e) { return fail(res, e); }
}
export async function topics(req: Request, res: Response) {
  if (!authorized(req, res)) return;
  try { return res.json({ success: true, items: await service.listTopics(typeof req.query.status === 'string' ? req.query.status : undefined) }); } catch (e) { return fail(res, e); }
}
export async function articles(req: Request, res: Response) {
  if (!authorized(req, res)) return;
  try { return res.json({ success: true, items: await service.listArticles(typeof req.query.status === 'string' ? req.query.status : undefined) }); } catch (e) { return fail(res, e); }
}
export async function createDraft(req: Request, res: Response) {
  if (!authorized(req, res)) return;
  if (typeof req.body?.topicId !== 'string' || !req.body.topicId.trim()) return res.status(400).json({ success: false, error: 'TOPIC_ID_REQUIRED' });
  try { return res.status(201).json({ success: true, item: await service.createDraft(req.body.topicId) }); } catch (e) { return fail(res, e); }
}
export async function updateDraft(req: Request, res: Response) {
  if (!authorized(req, res)) return;
  const body = req.body || {};
  if (['title', 'excerpt', 'body', 'category'].some(key => body[key] !== undefined && typeof body[key] !== 'string')) return res.status(400).json({ success: false, error: 'INVALID_FIELD_TYPE' });
  try { return res.json({ success: true, item: await service.updateDraft(req.params.id, body) }); } catch (e) { return fail(res, e); }
}
export async function approveArticle(req: Request, res: Response) {
  if (!authorized(req, res)) return;
  try { return res.json({ success: true, item: await service.approveArticle(req.params.id) }); } catch (e) { return fail(res, e); }
}
export async function publish(req: Request, res: Response) {
  if (!authorized(req, res)) return;
  try { return res.json({ success: true, item: await service.publishArticle(req.params.id) }); } catch (e) { return fail(res, e); }
}
