import express from 'express';
import request from 'supertest';

process.env.SALE_IA_ADMIN_KEY = 'blog-factory-test-key';

jest.mock('../src/modules/blogFactory/blogFactory.service', () => ({
  getStatus: jest.fn().mockResolvedValue({ module: 'blog-factory-ia', status: 'READY' }),
  runAutomationCycle: jest.fn().mockResolvedValue({ topicsConsidered: 0, generatedArticleIds: [], failures: [], requiresHumanApproval: true }),
  generateArticle: jest.fn().mockResolvedValue({ id: 'article-1', status: 'DRAFT' }),
  discoverTrends: jest.fn().mockResolvedValue({ discovered: 1, feedsChecked: 1, failures: [] }),
  listTopics: jest.fn().mockResolvedValue([]),
  listArticles: jest.fn().mockResolvedValue([]),
  createDraft: jest.fn().mockResolvedValue({ id: 'article-1', status: 'DRAFT' }),
  updateDraft: jest.fn().mockResolvedValue({ id: 'article-1', status: 'DRAFT' }),
  approveArticle: jest.fn().mockResolvedValue({ id: 'article-1', status: 'APPROVED' }),
  publishArticle: jest.fn().mockResolvedValue({ id: 'article-1', status: 'SENT_TO_WORDPRESS_DRAFT' })
}));

import blogFactoryRoutes from '../src/modules/blogFactory/blogFactory.routes';

const app = express();
app.use(express.json());
app.use('/api/blog-factory', blogFactoryRoutes);
const auth = { 'x-sale-ia-admin-key': 'blog-factory-test-key' };

describe('Blog Factory API', () => {
  it('exposes health without admin key and reports module status', async () => {
    const response = await request(app).get('/api/blog-factory/health');
    expect(response.status).toBe(200);
    expect(response.body.module).toBe('blog-factory-ia');
  });

  it('rejects protected status endpoint without credentials', async () => {
    const response = await request(app).get('/api/blog-factory/status');
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('UNAUTHORIZED');
  });

  it('returns module status with valid admin key', async () => {
    const response = await request(app).get('/api/blog-factory/status').set(auth);
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('requires topicId when creating a draft', async () => {
    const response = await request(app).post('/api/blog-factory/articles/draft').set(auth).send({});
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('TOPIC_ID_REQUIRED');
  });

  it('rejects invalid draft field types', async () => {
    const response = await request(app).patch('/api/blog-factory/articles/article-1').set(auth).send({ title: 42 });
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('INVALID_FIELD_TYPE');
  });

  it('returns a generated draft for a valid topic', async () => {
    const response = await request(app).post('/api/blog-factory/topics/topic-1/generate').set(auth);
    expect(response.status).toBe(201);
    expect(response.body.item.status).toBe('DRAFT');
  });

  it('runs automation only with administrator authentication', async () => {
    const response = await request(app).post('/api/blog-factory/run-cycle').set(auth);
    expect(response.status).toBe(200);
    expect(response.body.requiresHumanApproval).toBe(true);
  });
});
