import { Router } from 'express';
import { adminAuthorization } from '../../middlewares/security';
import { listarPlataformas, cadastrarCredencial, obterStatusPlataforma } from './credenciais.controller';

export const credenciaisRoutes = Router();
credenciaisRoutes.use(adminAuthorization);
credenciaisRoutes.get('/', listarPlataformas);
credenciaisRoutes.post('/cadastrar', cadastrarCredencial);
credenciaisRoutes.get('/:plataforma', obterStatusPlataforma);
