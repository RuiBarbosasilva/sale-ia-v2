import { websiteStudioController } from '../controllers/websiteStudioController';
import { Router } from 'express';
import { adminAuthorization } from '../middlewares/security';
import { websiteController } from '../controllers/websiteController';

const router = Router();

router.post('/analyze', adminAuthorization, (req, res) => websiteController.analyze(req, res));
router.post('/generate', adminAuthorization, (req, res) => websiteController.generate(req, res));
router.get('/demos', (req, res) => websiteController.listDemos(req, res));
router.get('/demo/:id', (req, res) => websiteController.getDemo(req, res));


// ==========================================
// SITE FACTORY STUDIO (Briefing -> Geracao -> Preview -> Export)
// ==========================================
router.get('/studio/prospects', websiteStudioController.listProspects);
router.post('/studio/prospects', adminAuthorization, websiteStudioController.createProspect);
router.get('/studio/templates', websiteStudioController.listTemplates);
router.get('/studio/briefing/:prospectId', websiteStudioController.getBriefing);
router.get('/studio/versions/:prospectId', websiteStudioController.listVersions);
router.post('/studio/generate', websiteStudioController.generateFromBriefing, adminAuthorization);
router.post('/studio/demos/:id/regenerate', websiteStudioController.regenerate, adminAuthorization);
router.post('/studio/demos/:id/repair-images', websiteStudioController.repairImages, adminAuthorization);
router.post('/studio/demos/:id/approve', websiteStudioController.approve, adminAuthorization);
router.get('/studio/demos/:id/html', websiteStudioController.getHtml);
router.get('/studio/demos/:id/export', websiteStudioController.exportZip);
router.post('/studio/generate-professional', websiteStudioController.generateProfessional, adminAuthorization);
router.get('/studio/ai-status', websiteStudioController.aiStatus);
router.get('/studio/demos/:id/assets', websiteStudioController.getAssets);
router.post('/studio/demos/:id/improve', websiteStudioController.improveDemo, adminAuthorization);
router.get('/studio/history/:prospectId', websiteStudioController.getHistory);
router.get('/studio/demos/:id/details', websiteStudioController.getDemoDetails);
router.post('/studio/demos/:id/rollback', websiteStudioController.rollbackTo, adminAuthorization);
router.post('/studio/projects/prepare', websiteStudioController.preparePublication, adminAuthorization);
router.post('/studio/projects/publish', websiteStudioController.publishProject, adminAuthorization);
export default router;





