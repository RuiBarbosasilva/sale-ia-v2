import 'dotenv/config';
import { dashboardRoutes } from './modules/dashboard/dashboard.routes';
import { websiteDemoFactoryService } from './services/prospecting/websiteDemoFactoryService';
import { mercadoLivreWebhookWorker } from './modules/mercadoLivre/workers/mercadoLivreWebhookWorker';
import app from './app';

const PORT = process.env.PORT || 3000;

let server;

// Rotas do dashboard
app.use('/dashboard', dashboardRoutes);

if (process.env.NODE_ENV !== 'test') {
  server = app.listen(PORT, async () => {
    console.log(`[SERVER] Rodando na porta ${PORT}`);
    if (String(process.env.RB_FACTORY_AUTONOMY_ENABLED || '').toLowerCase() === 'true') {
      try {
        const { rbFactorySalesAutonomyService } = await import('./services/rbFactorySalesAutonomyService');
        await rbFactorySalesAutonomyService.start();
        console.log('[RB FACTORY] Autonomia iniciada automaticamente.');
      } catch (error: any) {
        console.error('[RB FACTORY] Falha ao iniciar autonomia:', error?.message || error);
      }
    }
  });
}

export default server;