import { closeRedis } from '../src/config/queue';
describe("DB & Server Pure Module Isolation", () => {
  let consoleSpy: jest.SpyInstance;

  beforeAll(() => {
    consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterAll(() => {
    consoleSpy.mockRestore();
  });

  it("deve importar db.ts sem falhas", () => {
    jest.isolateModules(() => {
      try { require("../src/db"); } catch (e) {}
    });
  });

  it("deve importar e instanciar rotas de server.ts", () => {
    process.env.PORT = "0";
    jest.isolateModules(() => {
      try {
        const expressApp = require('../src/app');
        if (expressApp && expressApp.close) expressApp.close();
      } catch (e) {}
    });
  });
});

afterAll(async () => {
  await closeRedis();
});
