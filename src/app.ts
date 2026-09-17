import dashboardRoutes from './routes/dashboardRoutes';
import mlRoutes from './modules/mercadoLivre/routes/mercadoLivreRoutes';
import cookieParser from 'cookie-parser';
import express from 'express';
import apiRoutes from './routes/apiRoutes';
import { errorHandler } from './middlewares/errorHandler';

const app = express();

app.use(express.json())
app.use(cookieParser());;

// Servir arquivos estaticos do frontend
// Middleware UTF-8 inteligente (nÃ£o sobrescreve JSON)
app.use((req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = function(data) {
    this.setHeader('Content-Type', 'application/json; charset=utf-8');
    return originalJson(data);
  };
  next();
});

app.use(express.static('public'));
app.use('/generated-images', express.static('storage/generated-images'));

// Registra as rotas principais da API
app.use('/api', apiRoutes);

// Middleware global de tratamento de erros
app.use(errorHandler);

export default app;

app.use('/api/mercadolivre', mlRoutes);
app.use('/dashboard', dashboardRoutes);



