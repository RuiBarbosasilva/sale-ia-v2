import { Router } from 'express';
import { listarPlataformas, cadastrarCredencial, obterStatusPlataforma } from './credenciais.controller';

export const credenciaisRoutes = Router();
credenciaisRoutes.get('/', listarPlataformas);
credenciaisRoutes.post('/cadastrar', cadastrarCredencial);
credenciaisRoutes.get('/:plataforma', obterStatusPlataforma);
