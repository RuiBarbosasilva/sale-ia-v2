import * as schemas from "../src/schemas";
import { validate } from "../src/middlewares/validate";
import { z } from "zod";
import { Request, Response, NextFunction } from "express";

describe("Schemas and Validation Middleware", () => {
  it("deve carregar todos os schemas com sucesso", () => {
    expect(schemas).toBeDefined();
  });

  describe("validate middleware", () => {
    it("deve chamar next() quando a validação passa", async () => {
      const schema = z.object({
        body: z.object({
          name: z.string(),
        }),
      });

      const req = { body: { name: "Teste" }, query: {}, params: {} } as unknown as Request;
      const res = {} as Response;
      const next = jest.fn();

      const middleware = validate(schema);
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it("deve passar erro para o next() quando a validação falha", async () => {
      const schema = z.object({
        body: z.object({
          name: z.string(),
        }),
      });

      const req = { body: { name: 123 }, query: {}, params: {} } as unknown as Request;
      const res = {} as Response;
      const next = jest.fn();

      const middleware = validate(schema);
      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Object));
    });
  });
});
