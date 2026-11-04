import request from "supertest";
import express from "express";
import dashboardRoutes from "../src/routes/dashboardRoutes";
import { dashboardRoutes as legacyDashboardRoutes } from "../src/modules/dashboard/dashboard.routes";

process.env.SALE_IA_ADMIN_KEY = "test-admin-key-123456";

jest.mock("../src/modules/mercadoLivre/controllers/metricsController", () => ({
  fetchMLMetrics: jest.fn(),
}));

jest.mock("../src/services/affiliateIntelligenceService", () => ({
  affiliateIntelligenceService: {
    listNetworks: jest.fn().mockResolvedValue([]),
    topProducts: jest.fn().mockResolvedValue([]),
    opportunities: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock("../src/services/hunterService", () => ({
  hunterService: {
    dashboard: jest.fn().mockResolvedValue({
      opportunities: 0,
      suppliers: 0,
      products: 0,
      mode: "TEST",
    }),
  },
}));

jest.mock("../src/services/salesOrchestrationService", () => ({
  salesOrchestrationService: {
    analytics: jest.fn().mockResolvedValue({
      funnel: {
        openConversations: 0,
        hotLeads: 0,
        pendingActions: 0,
        pendingFollowUps: 0,
      },
      offers: 0,
      activeExperiments: 0,
      metrics: [],
    }),
  },
}));

jest.mock("../src/services/opportunitySalesBridgeService", () => ({
  opportunitySalesBridgeService: {
    plans: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock("../src/modules/mercadoLivre/lib/prisma", () => ({
  prisma: {
    editorialProject: {
      count: jest.fn().mockResolvedValue(0),
    },
  },
}));

import { fetchMLMetrics } from "../src/modules/mercadoLivre/controllers/metricsController";

const app = express();
app.use(express.json());
app.use("/dashboard", dashboardRoutes);
app.use("/legacy-dashboard", legacyDashboardRoutes);

const auth = {
  "x-sale-ia-admin-key": "test-admin-key-123456",
};

describe("Dashboard Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("protege métricas legadas de afiliados contra acesso sem autenticação", async () => {
    const res = await request(app).get("/legacy-dashboard/api/metricas");
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("ADMIN_UNAUTHORIZED");
  });

  it("bloqueia acesso administrativo sem chave", async () => {
    const res = await request(app).get("/dashboard/overview");
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("ADMIN_UNAUTHORIZED");
  });

  it("valida a chave administrativa no endpoint usado pelo dashboard central", async () => {
    const res = await request(app).get("/dashboard/auth/check").set(auth);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, authenticated: true });
  });

  it("recusa chave administrativa inválida no endpoint de validação", async () => {
    const res = await request(app)
      .get("/dashboard/auth/check")
      .set("x-sale-ia-admin-key", "chave-incorreta");
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("ADMIN_UNAUTHORIZED");
  });

  it("retorna overview do Mercado Livre com autenticação", async () => {
    (fetchMLMetrics as jest.Mock).mockResolvedValue({
      account: {
        id: "acc-1",
        nickname: "RB",
        mlUserId: "123",
        isActive: true,
      },
      items: { total: 10, active: 8, paused: 2, totalStock: 25 },
      orders: { total: 5, paid: 4, cancelled: 1, revenue: 399.9 },
      shipments: { total: 5, byStatus: { shipped: 5 } },
      lastSync: null,
    });

    const res = await request(app)
      .get("/dashboard/overview")
      .set(auth);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalRevenue).toBe(399.9);
    expect(res.body.data.totalItems).toBe(10);
    expect(res.body.data.totalOrders).toBe(5);
  });

  it("retorna 404 quando não há conta Mercado Livre ativa", async () => {
    (fetchMLMetrics as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .get("/dashboard/overview")
      .set(auth);

    expect(res.status).toBe(404);
    expect(res.body.message).toContain("Nenhuma conta Mercado Livre");
  });

  it("retorna 500 quando o carregamento do overview falha", async () => {
    (fetchMLMetrics as jest.Mock).mockRejectedValue(new Error("DB error"));

    const res = await request(app)
      .get("/dashboard/overview")
      .set(auth);

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });

  it("retorna operações agregadas", async () => {
    const res = await request(app)
      .get("/dashboard/operations")
      .set(auth);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("affiliates");
    expect(res.body.data).toHaveProperty("hunter");
    expect(res.body.data).toHaveProperty("sales");
    expect(res.body.data).toHaveProperty("opportunityPlans");
    expect(res.body.data).toHaveProperty("editorial");
  });
});
