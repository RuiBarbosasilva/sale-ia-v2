import { blogFactoryService } from './blogFactory.service';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export class BlogFactoryScheduler {
  async runCycle() {
    console.log('[BlogFactory] Iniciando ciclo de coleta e geração...');
    const pautas = await prisma.blogPauta.findMany({ where: { status: 'PENDING' }, take: 3 });
    
    for (const pauta of pautas) {
      const article = await blogFactoryService.generateArticle(pauta);
      
      // AUTOMAÇÃO: Se configurado, aprova e envia como rascunho automaticamente
      if (process.env.BLOG_AUTO_APPROVE === 'true') {
        await blogFactoryService.autoApproveAndSendToWP(article.id);
      }
    }
    console.log('[BlogFactory] Ciclo concluído.');
  }
}
export const blogFactoryScheduler = new BlogFactoryScheduler();
