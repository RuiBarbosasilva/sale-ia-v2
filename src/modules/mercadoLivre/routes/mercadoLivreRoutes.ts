// src/modules/mercadoLivre/routes/mercadoLivreRoutes.ts
import { Router } from 'express';
import * as authController from '../controllers/authController';
import { getAccount } from '../controllers/accountController';
import * as listingController from '../controllers/listingController';
import * as shipmentController from '../controllers/shipmentController';
import { handleWebhook } from '../notifications/webhookController';
import { healthCheck } from '../controllers/healthController';
import { syncItems } from '../controllers/syncController';
import { listItems } from '../controllers/itemsController';
import { syncOrders, listOrders } from '../controllers/orderSyncController';
import { getMetrics } from '../controllers/metricsController';
import {
  calculateDropshippingMargin,
  evaluateDropshippingProduct,
  evaluateDropshippingSupplier,
  getDropshippingRules,
  assessDropshippingSupplierCandidate,
  assessDropshippingProductCandidate,
  searchDropshippingMarketplace,
  listDropshippingResearchRuns,
  listDropshippingSnapshots,
  listDropshippingSupplierCandidates,
  validateDropshippingSupplierCandidate,
  listDropshippingAlerts,
  resolveDropshippingAlert,
  getDropshippingPriceHistory,
  listDropshippingProductCandidates,
} from '../controllers/dropshippingController';
import { mercadoLivreAdminGuard } from '../middleware/adminGuard';

const router = Router();

// --- SAÚDE ---
router.get('/health', healthCheck);

// --- AUTENTICAÇÃO ---
router.get('/auth/connect', authController.connect);
router.get('/auth/callback', authController.callback);
router.post('/auth/disconnect/:accountId', mercadoLivreAdminGuard, authController.disconnect);

// O webhook é público por definição: a validação do evento ocorre no controller.
router.post('/webhooks', handleWebhook);

// Tudo abaixo do OAuth/webhook exige autorização administrativa do SALE-IA.
// O accountId continua sendo resolvido no backend; o cliente nunca é considerado
// uma fonte de autorização por si só.
router.use(mercadoLivreAdminGuard);

// --- INTELIGÊNCIA DE DROPSHIPPING ---
// Estes endpoints calculam scores; não publicam anúncios nem criam pedidos.
router.get('/dropshipping/rules', getDropshippingRules);
router.get('/dropshipping/research/marketplace', searchDropshippingMarketplace);
router.get('/dropshipping/research/runs', listDropshippingResearchRuns);
router.get('/dropshipping/research/snapshots', listDropshippingSnapshots);
router.get('/dropshipping/research/price-history/:itemId', getDropshippingPriceHistory);
router.get('/dropshipping/suppliers/candidates', listDropshippingSupplierCandidates);
router.post('/dropshipping/suppliers/candidates/:id/validate', validateDropshippingSupplierCandidate);
router.get('/dropshipping/alerts', listDropshippingAlerts);
router.post('/dropshipping/alerts/:id/resolve', resolveDropshippingAlert);
router.post('/dropshipping/assess-supplier-candidate', assessDropshippingSupplierCandidate);
router.post('/dropshipping/assess-product-candidate', assessDropshippingProductCandidate);
router.get('/dropshipping/products/candidates', listDropshippingProductCandidates);
router.post('/dropshipping/calculate-margin', calculateDropshippingMargin);
router.post('/dropshipping/score-supplier', evaluateDropshippingSupplier);
router.post('/dropshipping/score-product', evaluateDropshippingProduct);

// --- CONTA ---
router.get('/account', getAccount);

// --- SINCRONIZAÇÃO DE ANÚNCIOS ---
router.post('/sync/items', syncItems);

// --- ANÚNCIOS (ITEMS) ---
router.get('/items', listItems);

// --- SINCRONIZAÇÃO DE PEDIDOS ---
router.post('/sync/orders', syncOrders);
router.post('/sync/shipments', shipmentController.syncShipments);

// --- MÉTRICAS ---
router.get('/metrics', getMetrics);

// --- PEDIDOS (ORDERS) ---
router.get('/orders', listOrders);

// --- LISTAGENS (API DIRETA DO ML) ---
router.get('/listings', listingController.getListings);
router.get('/listings/:id', listingController.getItem);
router.post('/listings', listingController.createListing);
router.patch('/listings/:id', listingController.updateListing);
router.post('/listings/:id/pause', listingController.pauseListing);
router.post('/listings/:id/activate', listingController.activateListing);

// --- ENVIO (SHIPMENTS) ---
router.get('/shipments', shipmentController.listShipments);
router.get('/shipments/:id', shipmentController.getShipment);
router.get('/shipments/:id/label', shipmentController.getShipmentLabel);

export default router;
