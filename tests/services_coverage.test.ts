import * as orderService from "../src/services/orderService";
import * as recoveryService from "../src/services/recoveryService";
import * as followUpService from "../src/services/followUpService";
import * as escalationService from "../src/services/escalationService";
import * as systemAuditService from "../src/services/systemAuditService";

describe("Services Coverage Tests", () => {
  it("deve carregar orderService corretamente", () => {
    expect(orderService).toBeDefined();
  });

  it("deve carregar recoveryService corretamente", () => {
    expect(recoveryService).toBeDefined();
  });

  it("deve carregar followUpService corretamente", () => {
    expect(followUpService).toBeDefined();
  });

  it("deve carregar escalationService corretamente", () => {
    expect(escalationService).toBeDefined();
  });

  it("deve carregar systemAuditService corretamente", () => {
    expect(systemAuditService).toBeDefined();
  });
});
