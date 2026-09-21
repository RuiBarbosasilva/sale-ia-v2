import siteFactoryDashboardRoutes from './siteFactoryDashboardRoutes';
import templateRoutes from './templateRoutes';
import categoryRoutes from './categoryRoutes';
﻿import websiteRoutes from './websiteRoutes';
import siteSalesRoutes from './siteSalesRoutes';
import checkoutRoutes from './checkoutRoutes';
import schedulerRoutes from './schedulerRoutes';
import financialRoutes from './financialRoutes';
import productSegmentRoutes from './productSegmentRoutes';
import followUpRoutes from './followUpRoutes';
import outreachRoutes from './outreachRoutes';
import { Router } from "express";
import { chat } from "../controllers/chatController";
import dashboardRoutes from "./dashboardRoutes";
import leadRoutes from "./leadRoutes";
import paymentRoutes from "./paymentRoutes";
import pixRoutes from "./pixRoutes";
import pricingRoutes from "./pricing";
import webhookRoutes from "./webhookRoutes";
import importRoutes from "./importRoutes";
import segmentRoutes from "./segmentRoutes";
import campaignRoutes from "./campaignRoutes";
import emailRoutes from "./emailRoutes";
import productRoutes from "./productRoutes";
import supplierRoutes from './supplierRoutes';
import creativeRoutes from './creativeRoutes';
import prospectingRoutes from './prospectingRoutes';
import automationRoutes from "./automationRoutes";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "SALE-IA-V2",
    timestamp: new Date().toISOString()
  });
});

// Existing application routes
router.post("/chat", chat);
router.use("/dashboard", dashboardRoutes);
router.use("/leads", leadRoutes);
router.use("/payments", paymentRoutes);
router.use("/pix", pixRoutes);
router.use("/pricing", pricingRoutes);
router.use("/webhook", webhookRoutes);

// Existing application routes
router.use("/import", importRoutes);
router.use("/segments", segmentRoutes);
router.use("/campaigns", campaignRoutes);
router.use("/email", emailRoutes);
router.use("/products", productRoutes);
router.use("/automation", automationRoutes);

router.use('/creatives', creativeRoutes);

router.use('/suppliers', supplierRoutes);

router.use('/outreach', outreachRoutes);

router.use('/followup', followUpRoutes);

router.use('/segments', productSegmentRoutes);

router.use('/financial', financialRoutes);

router.use('/scheduler', schedulerRoutes);

router.use('/checkout', checkoutRoutes);

router.use('/prospecting', prospectingRoutes);

router.use('/site-sales', siteSalesRoutes);

router.use('/websites', websiteRoutes);

router.use('/categories', categoryRoutes);

router.use('/templates', templateRoutes);

router.use('/site-factory-dashboard', siteFactoryDashboardRoutes);

export default router;
