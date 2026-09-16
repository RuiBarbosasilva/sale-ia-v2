import request from "supertest";
import express, { Request, Response, NextFunction } from "express";
import { AppError } from "../src/errors/AppError";
import { errorHandler } from "../src/middlewares/errorHandler";
import * as validateMiddleware from "../src/middlewares/validate";
import * as chatController from "../src/controllers/chatController";
import * as whatsappController from "../src/controllers/whatsappController";

describe("Controllers & Middlewares Tests", () => {
  describe("AppError", () => {
    it("deve instanciar AppError corretamente com status padrão e customizado", () => {
      const err1 = new AppError("Erro simples");
      expect(err1.statusCode).toBe(400);
      expect(err1.message).toBe("Erro simples");

      const err2 = new AppError("Não encontrado", 404);
      expect(err2.statusCode).toBe(404);
    });
  });

  describe("errorHandler Middleware", () => {
    let app: express.Express;

    beforeEach(() => {
      app = express();
      app.use(express.json());

      app.get("/test-app-error", (req: Request, res: Response, next: NextFunction) => {
        next(new AppError("Erro customizado", 422));
      });

      app.get("/test-generic-error", (req: Request, res: Response, next: NextFunction) => {
        next(new Error("Erro interno genérico"));
      });

      app.use(errorHandler);
    });

    it("deve tratar AppError retornando o statusCode correspondente", async () => {
      const res = await request(app).get("/test-app-error");
      expect(res.status).toBe(422);
      expect(res.body).toHaveProperty("message", "Erro customizado");
    });

    it("deve tratar erros genéricos retornando status 500", async () => {
      const res = await request(app).get("/test-generic-error");
      expect(res.status).toBe(500);
    });
  });

  describe("Controllers Imports", () => {
    it("deve carregar chatController e whatsappController com sucesso", () => {
      expect(chatController).toBeDefined();
      expect(whatsappController).toBeDefined();
      expect(validateMiddleware).toBeDefined();
    });
  });
});
