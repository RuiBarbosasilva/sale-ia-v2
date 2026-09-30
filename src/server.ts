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
  server = app.listen(PORT, () => {
    console.log(`[SERVER] Rodando na porta ${PORT}`);
  });
}

export default server;