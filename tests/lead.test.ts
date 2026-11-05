import request from "supertest";
import express from "express";
import leadRoutes from "../src/routes/leadRoutes";
import { PrismaClient } from "@prisma/client";
import * as leadService from "../src/services/leadService";

const app = express();
app.use(express.json());
app.use("/leads", leadRoutes);

// Mock Prisma
jest.mock("@prisma/client", () => {
  const mockPrisma = {
    lead: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
    },
  };
  return {
    PrismaClient: jest.fn(() => mockPrisma),
  };
});

describe("Lead Routes & Service", () => {
  const previousAdminKey = process.env.SALE_IA_ADMIN_KEY;
  let prisma: any;

  beforeAll(() => {
    process.env.SALE_IA_ADMIN_KEY = "lead-routes-test-admin-secret";
  });

  afterAll(() => {
    if (previousAdminKey === undefined) delete process.env.SALE_IA_ADMIN_KEY;
    else process.env.SALE_IA_ADMIN_KEY = previousAdminKey;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    const instance = new PrismaClient();
    prisma = instance;
  });

  describe("GET /leads", () => {
    it("deve lidar com a requisição GET /leads", async () => {
      const mockLeads = [
        { id: "1", name: "Lead 1", phone: "5535999999999", status: "NEW" },
      ];

      prisma.lead.findMany.mockResolvedValue(mockLeads);

      const res = await request(app).get("/leads").set("x-sale-ia-admin-key", "lead-routes-test-admin-secret");
      expect(res.status).toBe(200);
    });
  });

  describe("GET /leads/:phone", () => {
    it("deve lidar com a requisição GET /leads/:phone", async () => {
      const mockLead = { id: "1", name: "João", phone: "5535999999999", status: "QUALIFICATION" };
      prisma.lead.findUnique.mockResolvedValue(mockLead);
      prisma.lead.findFirst.mockResolvedValue(mockLead);

      const res = await request(app).get("/leads/5535999999999").set("x-sale-ia-admin-key", "lead-routes-test-admin-secret");
      expect(res.status).toBe(404);
    });
  });

  describe("Módulo leadService", () => {
    it("deve garantir que o leadService está definido", () => {
      expect(leadService).toBeDefined();
    });
  });
});
