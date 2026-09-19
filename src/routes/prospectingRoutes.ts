// src/routes/prospectingRoutes.ts

import { Router } from 'express';
import { prospectingController } from '../controllers/prospectingController';

const router = Router();

router.get('/health', prospectingController.health);

router.post('/search', prospectingController.searchProspects);
router.get('/search/:id', prospectingController.getSearchStatus);

router.get('/prospects/grouped', prospectingController.getGroupedProspects);
router.get('/prospects', prospectingController.listProspects);
router.get('/prospects/:id', prospectingController.getProspectDetails);

router.post('/prospects/:id/enrich', prospectingController.enrichProspect);
router.post('/prospects/:id/audit', prospectingController.auditProspectWebsite);
router.post('/prospects/:id/score', prospectingController.scoreProspect);

router.post('/prospects/:id/generate-demo', prospectingController.generateDemo);
router.post('/generate-demos', prospectingController.generateDemosBatch);
router.get('/jobs/:jobId', prospectingController.getJobStatus);

router.get('/stats', prospectingController.getStats);

router.post('/prospects/:id/outreach/prepare', prospectingController.prepareOutreach);
router.post('/prospects/:id/outreach/send', prospectingController.sendOutreach);
router.get('/prospects/:id/whatsapp', prospectingController.getWhatsAppLink);
export default router;