import { websiteDemoFactoryService } from './services/prospecting/websiteDemoFactoryService';
﻿import { mercadoLivreWebhookWorker } from './modules/mercadoLivre/workers/mercadoLivreWebhookWorker';
import app from './app';

const PORT = process.env.PORT || 3000;

let server;

if (process.env.NODE_ENV !== 'test') {
  server = app.listen(PORT, () => {
    console.log(`[SERVER] Rodando na porta ${PORT}`);
  });
}

export default server;

import { initializeWorkers } from './config/queue';

// Workers somente em ambiente real.
// Em testes, nenhum timer ou worker de background sera criado.
if (process.env.NODE_ENV !== 'test') {
  setTimeout(() => {
    try {
      const recoveredDemoJobs = await websiteDemoFactoryService.recoverStaleJobs();
      if (recoveredDemoJobs > 0) {
        console.log(`[DEMO-JOBS] ${recoveredDemoJobs} job(s) stale recuperado(s)`);
      }

      const workers = initializeWorkers();

      console.log('[WORKERS] Workers inicializados com sucesso');

mercadoLivreWebhookWorker.start();

      const shutdown = async () => {
        console.log('[WORKERS] Fechando workers...');

        await Promise.all([
          workers.prospectWorker?.close(),
          workers.campaignWorker?.close(),
          workers.followUpWorker?.close()
        ].filter(Boolean));

        process.exit(0);
      };

      process.on('SIGTERM', shutdown);
      process.on('SIGINT', shutdown);
    } catch (error) {
      console.error('[WORKERS] Erro ao inicializar workers:', error);
    }
  }, 1000);
}
