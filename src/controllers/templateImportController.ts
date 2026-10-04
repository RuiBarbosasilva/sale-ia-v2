import { Request, Response } from 'express';
import { prisma } from '../modules/mercadoLivre/lib/prisma';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configuração do multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'templates');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'template-' + uniqueSuffix + ext);
  }
});

export const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.zip', '.html', '.htm'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos .zip ou .html são permitidos'));
    }
  }
});

export const templateImportController = {
  async import(req: any, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'Nenhum arquivo enviado' });
      }

      const { name, category, description, thumbnailUrl, prospectId } = req.body;
      
      if (!name) {
        return res.status(400).json({ success: false, error: 'Nome do modelo é obrigatório' });
      }

      const filePath = req.file.path;
      const isZip = path.extname(req.file.originalname).toLowerCase() === '.zip';

      // Se for HTML, lê o conteúdo para sourceCode
      let sourceCode = null;
      if (!isZip) {
        sourceCode = fs.readFileSync(filePath, 'utf-8');
      }

      // Cria ou localiza a categoria do template
      const categoryName = (category || 'Geral').trim();
      const categorySlug = categoryName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'geral';

      const templateCategory = await prisma.websiteCategory.upsert({
        where: { slug: categorySlug },
        update: {
          name: categoryName,
          active: true
        },
        create: {
          name: categoryName,
          slug: categorySlug,
          active: true
        }
      });

      // Cria o template no banco
      const template = await prisma.websiteTemplate.create({
        data: {
          name,
          description: description || null,
          slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
          categoryId: templateCategory.id,
          repositoryUrl: '/' + path.relative(process.cwd(), filePath).replace(/\\/g, '/'),
          thumbnailUrl: thumbnailUrl || null,
          sourceType: isZip ? 'zip' : 'html',
          active: true,
          featured: false
        }
      });

      // WebsiteDemo exige um prospect.
      // Portanto, somente cria o demo quando um prospectId válido for informado.
      if (sourceCode && prospectId) {
        await prisma.websiteDemo.create({
          data: {
            templateId: template.id,
            prospectId,
            sourceCode,
            status: 'APPROVED',
            generatedAt: new Date()
          }
        });
      }

      console.log('[TemplateImport] Template importado:', template.id);

      return res.json({ 
        success: true, 
        message: 'Template importado com sucesso',
        data: template 
      });

    } catch (error: any) {
      console.error('[TemplateImport] Erro:', error.message);
      return res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  },

  async list(req: Request, res: Response) {
    try {
      const templates = await prisma.websiteTemplate.findMany({
        orderBy: { createdAt: 'desc' }
      });
      return res.json({ success: true, templates });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }
};
