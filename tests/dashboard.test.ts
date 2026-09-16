import request from "supertest";
import express from "express";
import dashboardRoutes from "../src/routes/dashboardRoutes";
import { PrismaClient } from "@prisma/client";
import { evolutionService } from "../src/services/evolutionService";

const app = express();
app.use(express.json());
app.use("/dashboard", dashboardRoutes);

jest.mock("../src/services/evolutionService", () => ({
  evolutionService: {
    sendTextMessage: jest.fn().mockResolvedValue({ status: "SUCCESS" }),
  },
}));

jest.mock("../src/services/leadService", () => ({
  setHumanMode: jest.fn().mockResolvedValue(true),
}));

// Mock Prisma
jest.mock("@prisma/client", () => {
  const mockPrisma = {
    lead: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    message: {
      count: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    order: {
      aggregate: jest.fn(),
    },
  };
  return {
    PrismaClient: jest.fn(() => mockPrisma),
  };
});

describe("Dashboard Routes", () => {
  let prisma: any;

  beforeEach(() => {
    jest.clearAllMocks();
    const instance = new PrismaClient();
    prisma = instance;
  });

  describe("GET /dashboard/overview", () => {
    it("deve retornar métricas e lista de leads com sucesso", async () => {
      const mockLeads = [
        { id: "1", phone: "5535999999999", status: "HUMAN_HANDOVER", updatedAt: new Date() },
        { id: "2", phone: "5535888888888", status: "QUALIFICATION", updatedAt: new Date() },
      ];

      prisma.lead.findMany.mockResolvedValue(mockLeads);
      prisma.message.count.mockResolvedValue(3);

      const res = await request(app).get("/dashboard/overview");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("metrics");
      expect(res.body.metrics.totalLeads).toBe(2);
      expect(res.body.metrics.humanModeLeads).toBe(1);
      expect(res.body.metrics.pixGenerated).toBe(3);
      expect(res.body.leads.length).toBe(2);
    });

    it("deve tratar erros internos e retornar status 500", async () => {
      prisma.lead.findMany.mockRejectedValue(new Error("Database error"));

      const res = await request(app).get("/dashboard/overview");

      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty("error", "Erro ao buscar dados do dashboard.");
    });
  });

  describe("GET /dashboard/sales-metrics", () => {
    it("deve retornar a receita total acumulada no mês", async () => {
      prisma.order.aggregate.mockResolvedValue({
        _sum: { totalValue: 1500.5 },
      });

      const res = await request(app).get("/dashboard/sales-metrics");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ totalRevenue: 1500.5 });
    });

    it("deve retornar 0 quando não houver vendas ou ocorrer erro", async () => {
      prisma.order.aggregate.mockRejectedValue(new Error("DB error"));

      const res = await request(app).get("/dashboard/sales-metrics");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ totalRevenue: 0 });
    });
  });

  describe("GET /dashboard/messages", () => {
    it("deve retornar 400 se o telefone não for informado", async () => {
      const res = await request(app).get("/dashboard/messages");

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error", "Informe o parâmetro 'phone'.");
    });

    it("deve retornar 404 se o lead não for encontrado", async () => {
      prisma.lead.findUnique.mockResolvedValue(null);

      const res = await request(app).get("/dashboard/messages?phone=5535999999999");

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("error", "Lead não encontrado.");
    });

    it("deve retornar mensagens do lead quando encontrado", async () => {
      prisma.lead.findUnique.mockResolvedValue({ id: "lead-1", phone: "5535999999999" });
      prisma.message.findMany.mockResolvedValue([
        { id: "m1", leadId: "lead-1", content: "Olá", sender: "USER" },
        { id: "m2", leadId: "lead-1", content: "Como posso ajudar?", sender: "AI" },
      ]);

      const res = await request(app).get("/dashboard/messages?phone=5535999999999");

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
    });

    it("deve retornar 500 em caso de erro na consulta", async () => {
      prisma.lead.findUnique.mockRejectedValue(new Error("DB error"));

      const res = await request(app).get("/dashboard/messages?phone=5535999999999");

      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty("error", "Erro ao buscar mensagens.");
    });
  });

  describe("POST /dashboard/toggle-human-mode", () => {
    it("deve retornar 400 se parâmetros forem inválidos", async () => {
      const res = await request(app).post("/dashboard/toggle-human-mode").send({ phone: "123" });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error", "Parâmetros 'phone' e 'humanMode' são obrigatórios.");
    });

    it("deve retornar 404 se o lead não existir", async () => {
      prisma.lead.findUnique.mockResolvedValue(null);

      const res = await request(app).post("/dashboard/toggle-human-mode").send({
        phone: "5535999999999",
        humanMode: true,
      });

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("error", "Lead não encontrado.");
    });

    it("deve alterar para atendimento humano com sucesso", async () => {
      prisma.lead.findUnique.mockResolvedValue({ id: "lead-1", phone: "5535999999999" });
      prisma.lead.update.mockResolvedValue({ id: "lead-1", status: "HUMAN_HANDOVER" });

      const res = await request(app).post("/dashboard/toggle-human-mode").send({
        phone: "5535999999999",
        humanMode: true,
      });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        success: true,
        phone: "5535999999999",
        humanMode: true,
        status: "HUMAN_HANDOVER",
      });
    });

    it("deve retornar 500 se ocorrer erro ao atualizar", async () => {
      prisma.lead.findUnique.mockRejectedValue(new Error("DB error"));

      const res = await request(app).post("/dashboard/toggle-human-mode").send({
        phone: "5535999999999",
        humanMode: true,
      });

      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty("error", "Erro ao alterar modo de atendimento.");
    });
  });

  describe("POST /dashboard/send-message", () => {
    it("deve retornar 400 se campos obrigatórios faltarem", async () => {
      const res = await request(app).post("/dashboard/send-message").send({ phone: "123" });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error", "Campos 'phone' e 'message' são obrigatórios.");
    });

    it("deve retornar 404 se lead não for encontrado", async () => {
      prisma.lead.findUnique.mockResolvedValue(null);

      const res = await request(app).post("/dashboard/send-message").send({
        phone: "5535999999999",
        message: "Olá, suporte aqui.",
      });

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("error", "Lead não encontrado.");
    });

    it("deve salvar mensagem e enviar pelo Evolution API com sucesso", async () => {
      prisma.lead.findUnique.mockResolvedValue({ id: "lead-1", phone: "5535999999999" });
      prisma.message.create.mockResolvedValue({
        id: "msg-1",
        leadId: "lead-1",
        sender: "HUMAN",
        content: "Olá, suporte aqui.",
      });

      const res = await request(app).post("/dashboard/send-message").send({
        phone: "5535999999999",
        message: "Olá, suporte aqui.",
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message.content).toBe("Olá, suporte aqui.");
      expect(evolutionService.sendTextMessage).toHaveBeenCalledWith({
        number: "5535999999999",
        text: "Olá, suporte aqui.",
      });
    });

    it("deve retornar 500 se houver falha ao criar mensagem no banco", async () => {
      prisma.lead.findUnique.mockRejectedValue(new Error("DB Error"));

      const res = await request(app).post("/dashboard/send-message").send({
        phone: "5535999999999",
        message: "Olá",
      });

      expect(res.status).toBe(500);
      expect(res.body).toHaveProperty("error", "Erro ao enviar mensagem do atendente.");
    });
  });
});
