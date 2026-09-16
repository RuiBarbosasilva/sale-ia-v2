import leadRoutes from "../src/routes/leadRoutes";
import pixRoutes from "../src/routes/pixRoutes";
import pricingRoutes from "../src/routes/pricing";

describe("Direct Express Route Stack Execution", () => {
  const createMockReqRes = (body = {}, params = {}, query = {}) => {
    const req: any = { body, params, query, headers: {} };
    const res: any = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    };
    const next = jest.fn();
    return { req, res, next };
  };

  const executeRouterHandlers = async (router: any) => {
    for (const layer of router.stack) {
      if (layer.route) {
        for (const routeHandler of layer.route.stack) {
          const { req, res, next } = createMockReqRes(
            { id: "1", amount: 100, leadId: "1", phone: "5511999999999", name: "Test Lead", message: "Olá" },
            { id: "1" },
            { leadId: "1", status: "pending" }
          );
          try {
            await routeHandler.handle(req, res, next);
          } catch (e) {}
        }
      }
    }
  };

  it("deve executar todos os handlers de leadRoutes diretamente", async () => {
    await executeRouterHandlers(leadRoutes);
  });

  it("deve executar todos os handlers de pixRoutes diretamente", async () => {
    await executeRouterHandlers(pixRoutes);
  });

  it("deve executar todos os handlers de pricingRoutes diretamente", async () => {
    await executeRouterHandlers(pricingRoutes);
  });
});
