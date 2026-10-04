import { Router } from 'express';
import {
  executarHunter,
  listarProdutos,
  cadastrarProduto,
  gerarCopies,
  gerarCriativo,
  gerarFluxoVendedor,
  divulgarNoTelegram,
  receberWebhookHotmart,
  relatorioOportunidades,
  obterDashboard
} from './afiliados-ia.controller';
import { debugCriativo } from './debug-criativo.controller';

export const afiliadosIaRoutes = Router();

// Rota de debug
afiliadosIaRoutes.get('/debug/criativo', debugCriativo);

// Rotas principais
afiliadosIaRoutes.post('/hunter/executar', executarHunter);
afiliadosIaRoutes.get('/produtos', listarProdutos);
afiliadosIaRoutes.post('/produtos', cadastrarProduto);
afiliadosIaRoutes.post('/copies/gerar', gerarCopies);
afiliadosIaRoutes.post('/criativo/gerar', gerarCriativo);
afiliadosIaRoutes.post('/vendedor/fluxo', gerarFluxoVendedor);
afiliadosIaRoutes.post('/divulgar/telegram', divulgarNoTelegram);
afiliadosIaRoutes.post('/webhook/hotmart', receberWebhookHotmart);
afiliadosIaRoutes.get('/oportunidades', relatorioOportunidades);
afiliadosIaRoutes.get('/dashboard', obterDashboard);
