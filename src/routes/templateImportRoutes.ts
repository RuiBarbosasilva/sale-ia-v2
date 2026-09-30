import { Router } from 'express';
import { templateImportController, upload } from '../controllers/templateImportController';

const router = Router();

router.post('/import', upload.single('file'), templateImportController.import);
router.get('/', templateImportController.list);

export default router;
