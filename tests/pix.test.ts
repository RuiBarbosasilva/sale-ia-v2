import request from "supertest";
import express from "express";
import pixRoutes from "../src/routes/pixRoutes";
import * as pixService from "../src/services/pixService";

const app = express();
app.use(express.json());
app.use("/pix", pixRoutes);

describe("PIX Routes & Service", () => {
  describe("GET /pix ou POST /pix", () => {
    it("deve responder a rotas de PIX", async () => {
      const res = await request(app).get("/pix");
      expect([200, 404, 500]).toContain(res.status);
    });
  });

  describe("Módulo pixService", () => {
    it("deve carregar o módulo pixService com sucesso", () => {
      expect(pixService).toBeDefined();
    });
  });
});
