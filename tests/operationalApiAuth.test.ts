import express from 'express';
import request from 'supertest';

import automationRoutes from '../src/routes/automationRoutes';
import campaignRoutes from '../src/routes/campaignRoutes';
import emailRoutes from '../src/routes/emailRoutes';
import outreachRoutes from '../src/routes/outreachRoutes';
import financialRoutes from '../src/routes/financialRoutes';
import schedulerRoutes from '../src/routes/schedulerRoutes';
import followUpRoutes from '../src/routes/followUpRoutes';
import importRoutes from '../src/routes/importRoutes';
import segmentRoutes from '../src/routes/segmentRoutes';
import siteSalesRoutes from '../src/routes/siteSalesRoutes';

const app = express();
app.use(express.json());
app.use('/api/automation', automationRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/outreach', outreachRoutes);
app.use('/api/financial', financialRoutes);
app.use('/api/scheduler', schedulerRoutes);
app.use('/api/followup', followUpRoutes);
app.use('/api/import', importRoutes);
app.use('/api/segments', segmentRoutes);
app.use('/api/site-sales', siteSalesRoutes);

describe('Operational API authorization', () => {
  const previousAdminKey = process.env.SALE_IA_ADMIN_KEY;

  beforeAll(() => {
    process.env.SALE_IA_ADMIN_KEY = 'operational-api-test-admin-secret';
  });

  afterAll(() => {
    if (previousAdminKey === undefined) delete process.env.SALE_IA_ADMIN_KEY;
    else process.env.SALE_IA_ADMIN_KEY = previousAdminKey;
  });

  const protectedRequests: Array<[string, () => request.Test]> = [
    ['automation campaign data', () => request(app).get('/api/automation/campaigns')],
    ['campaign creation', () => request(app).post('/api/campaigns/campaigns').send({})],
    ['email sending', () => request(app).post('/api/email/send-welcome').send({})],
    ['outreach statistics', () => request(app).get('/api/outreach/stats')],
    ['financial reports', () => request(app).get('/api/financial/by-segment')],
    ['scheduled publishing', () => request(app).post('/api/scheduler/run-job').send({})],
    ['follow-up execution', () => request(app).post('/api/followup/run-job').send({})],
    ['lead imports', () => request(app).post('/api/import/').send({})],
    ['lead segmentation', () => request(app).get('/api/segments/segments/stats')],
    ['site sales prospecting', () => request(app).post('/api/site-sales/prospect').send({})],
  ];

  it.each(protectedRequests)('requires admin authorization for %s', async (_name, buildRequest) => {
    const response = await buildRequest();
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('ADMIN_UNAUTHORIZED');
  });
});
