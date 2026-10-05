import { websiteStudioController } from '../controllers/websiteStudioController';
import { Router } from 'express';
import { adminAuthorization } from '../middlewares/security';
import { websiteController } from '../controllers/websiteController';
import multer from 'multer';

const router = Router();
const templateUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024, files: 1 } });

router.post('/analyze', (req, res) => websiteController.analyze(req, res));
router.post('/generate', (req, res) => websiteController.generate(req, res));
router.get('/demos', (req, res) => websiteController.listDemos(req, res));
router.get('/demo/:id', (req, res) => websiteController.getDemo(req, res));


router.get('/studio/demos/:id/html', websiteStudioController.getHtml);

// All Studio/API operations are admin-protected; the HTML preview above remains public for client sharing.
router.use(adminAuthorization);

// ==========================================
// SITE FACTORY STUDIO (Briefing -> Geracao -> Preview -> Export)
// ==========================================
router.get('/studio/prospects', websiteStudioController.listProspects);
router.post('/studio/prospects', websiteStudioController.createProspect);
router.get('/studio/templates', websiteStudioController.listTemplates);
router.get('/studio/templates/library', websiteStudioController.listImportedTemplateLibrary);
router.patch('/studio/templates/library/:id', websiteStudioController.updateImportedTemplate);
router.get('/studio/templates/library/:id/preview', websiteStudioController.previewImportedTemplate);
router.get('/studio/templates/library/:id/preview/*', websiteStudioController.previewImportedTemplateAsset);
router.get('/studio/templates/library/:id/download', websiteStudioController.downloadImportedTemplate);
router.delete('/studio/templates/library/:id', websiteStudioController.deleteImportedTemplate);
router.post('/studio/templates/import', templateUpload.single('file'), websiteStudioController.importTemplate);
router.get('/studio/briefing/:prospectId', websiteStudioController.getBriefing);
router.get('/studio/versions/:prospectId', websiteStudioController.listVersions);
router.post('/studio/generate', websiteStudioController.generateFromBriefing);
router.post('/studio/demos/:id/regenerate', websiteStudioController.regenerate);
router.post('/studio/demos/:id/repair-images', websiteStudioController.repairImages);
router.post('/studio/demos/:id/approve', websiteStudioController.approve);
router.get('/studio/demos/:id/export', websiteStudioController.exportZip);
router.post('/studio/generate-professional', websiteStudioController.generateProfessional);
router.get('/studio/ai-status', websiteStudioController.aiStatus);
router.get('/studio/demos/:id/assets', websiteStudioController.getAssets);
router.post('/studio/demos/:id/improve', websiteStudioController.improveDemo);
router.get('/studio/history/:prospectId', websiteStudioController.getHistory);
router.get('/studio/demos/:id/details', websiteStudioController.getDemoDetails);
router.post('/studio/demos/:id/rollback', websiteStudioController.rollbackTo);
router.post('/studio/projects/prepare', websiteStudioController.preparePublication);
router.post('/studio/projects/deploy-netlify', websiteStudioController.deployNetlify);
router.post('/studio/projects/publish', websiteStudioController.markProjectPublished);
export default router;





