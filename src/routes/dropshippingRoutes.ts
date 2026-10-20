import { Router } from 'express';
import { dropshippingController } from '../controllers/dropshippingController';

const router = Router();

// Dashboard
router.get('/dashboard', dropshippingController.dashboard);

// Produtos
router.get('/products', dropshippingController.listProducts);
router.get('/products/ranking', dropshippingController.listProducts);
router.get('/products/champions', dropshippingController.getChampions);
router.get('/products/scalable', dropshippingController.getScalable);
router.get('/products/:id', dropshippingController.getProduct);
router.post('/products', dropshippingController.createProduct);

// Fornecedores
router.get('/suppliers/validated', dropshippingController.getValidatedSuppliers);
router.get('/suppliers', dropshippingController.listSuppliers);
router.get('/suppliers/:id', dropshippingController.getSupplier);
router.post('/suppliers', dropshippingController.createSupplier);
router.post('/suppliers/:id/validate', dropshippingController.validateSupplier);

// Calculadora
router.post('/margins', dropshippingController.calculateMargin);
router.post('/scenarios', dropshippingController.simulateScenarios);

// AnÃƒÂºncios
router.get('/products/:id/listing', dropshippingController.generateListing);

// Pedidos
router.get('/orders', dropshippingController.listOrders);

// Alertas
router.get('/alerts', dropshippingController.listAlerts);

// RecomendaÃƒÂ§ÃƒÂµes
router.get('/recommendations', dropshippingController.getRecommendations);


// TendÃªncias ML
router.post('/trends/collect', dropshippingController.collectTrends);
router.get('/trends/latest', dropshippingController.getLatestTrends);
router.get('/trends/stats', dropshippingController.getTrendStats);


// Fornecedores (Hunter)
router.post('/suppliers/register', dropshippingController.registerSupplier);

export default router;
