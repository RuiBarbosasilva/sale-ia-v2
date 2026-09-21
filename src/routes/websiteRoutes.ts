import { websiteStudioController } from '../controllers/websiteStudioController';
import { Router } from 'express';
import { adminAuthorization } from '../middlewares/security';
import { websiteController } from '../controllers/websiteController';

const router = Router();

router.post('/analyze', adminAuthorization, (req, res) => websiteController.analyze(req, res));
router.post('/generate', adminAuthorization, (req, res) => websiteController.generate(req, res));
router.get('/demos', adminAuthorization, (req, res) => websiteController.listDemos(req, res));
router.get('/demo/:id', adminAuthorization, (req, res) => websiteController.getDemo(req, res));


// ==========================================
// SITE FACTORY STUDIO (Briefing -> Geracao -> Preview -> Export)
// ==========================================
router.get('/studio/prospects', adminAuthorization, websiteStudioController.listProspects);
router.post('/studio/prospects', adminAuthorization, websiteStudioController.createProspect);
router.get('/studio/templates', adminAuthorization, websiteStudioController.listTemplates);
router.get('/studio/briefing/:prospectId', adminAuthorization, websiteStudioController.getBriefing);
router.get('/studio/versions/:prospectId', adminAuthorization, websiteStudioController.listVersions);
router.post('/studio/generate', adminAuthorization, websiteStudioController.generateFromBriefing);
router.post('/studio/demos/:id/regenerate', adminAuthorization, websiteStudioController.regenerate);
router.post('/studio/demos/:id/repair-images', adminAuthorization, websiteStudioController.repairImages);
router.post('/studio/demos/:id/approve', adminAuthorization, websiteStudioController.approve);
router.get('/studio/demos/:id/html', adminAuthorization, websiteStudioController.getHtml);
router.get('/studio/demos/:id/export', adminAuthorization, websiteStudioController.exportZip);
router.post('/studio/generate-professional', adminAuthorization, websiteStudioController.generateProfessional);
router.get('/studio/ai-status', adminAuthorization, websiteStudioController.aiStatus);
router.get('/studio/demos/:id/assets', adminAuthorization, websiteStudioController.getAssets);
router.post('/studio/demos/:id/improve', adminAuthorization, websiteStudioController.improveDemo);
router.get('/studio/history/:prospectId', adminAuthorization, websiteStudioController.getHistory);
router.get('/studio/demos/:id/details', adminAuthorization, websiteStudioController.getDemoDetails);
router.post('/studio/demos/:id/rollback', adminAuthorization, websiteStudioController.rollbackTo);
router.post('/studio/projects/prepare', adminAuthorization, websiteStudioController.preparePublication);
router.post('/studio/projects/publish', adminAuthorization, websiteStudioController.publishProject);
export default router;





