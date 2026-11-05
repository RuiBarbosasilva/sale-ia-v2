import { Router, Request, Response } from 'express';
import multer from 'multer';
import * as fs from 'fs';
import { importLeadsFromCSV } from '../services/importService';

import { adminAuthorization } from '../middlewares/security';
const router = Router();
router.use(adminAuthorization);

const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});

const upload = multer({ 
  storage, 
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) cb(null, true);
    else cb(new Error('Apenas arquivos CSV são permitidos'));
  }
});

router.post('/', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    
    const result = await importLeadsFromCSV(req.file.path);
    
    // Limpar arquivo após processamento
    fs.unlinkSync(req.file.path);
    
    return res.json({ 
      success: true, 
      message: 'Importação concluída',
      data: result 
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;