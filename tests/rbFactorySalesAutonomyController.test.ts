import { rbFactorySalesAutonomyService } from '../src/services/rbFactorySalesAutonomyService';
import { rbFactorySalesAutonomyController } from '../src/controllers/rbFactorySalesAutonomyController';

jest.mock('../src/services/rbFactorySalesAutonomyService', () => ({
  rbFactorySalesAutonomyService: {
    status: jest.fn(),
    history: jest.fn(),
    alerts: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    acknowledge: jest.fn(),
    resolve: jest.fn(),
  },
}));

const service = rbFactorySalesAutonomyService as any;
function response() {
  return { json: jest.fn(), status: jest.fn().mockReturnThis() } as any;
}

describe('RB Factory autonomy controller', () => {
  beforeEach(() => jest.clearAllMocks());

  it('awaits and returns the resolved autonomy status', async () => {
    const value = { status: 'RUNNING', intervalMs: 300000, lastRun: { id: 'run-1' } };
    service.status.mockResolvedValue(value);
    const res = response();

    await rbFactorySalesAutonomyController.status({} as any, res);

    expect(res.json).toHaveBeenCalledWith({ success: true, result: value });
  });

  it('awaits history and clamps requested limits', async () => {
    service.history.mockResolvedValue({ runs: [{ id: 'run-1' }] });
    const res = response();

    await rbFactorySalesAutonomyController.history({ query: { limit: '999' } } as any, res);

    expect(service.history).toHaveBeenCalledWith(50);
    expect(res.json).toHaveBeenCalledWith({ success: true, runs: [{ id: 'run-1' }] });
  });

  it('uses safe defaults for invalid history and alert limits', async () => {
    service.history.mockResolvedValue({ runs: [] });
    service.alerts.mockResolvedValue({ alerts: [] });
    const historyRes = response();
    const alertsRes = response();

    await rbFactorySalesAutonomyController.history({ query: { limit: 'not-a-number' } } as any, historyRes);
    await rbFactorySalesAutonomyController.alerts({ query: { limit: '-4' } } as any, alertsRes);

    expect(service.history).toHaveBeenCalledWith(20);
    expect(service.alerts).toHaveBeenCalledWith(1);
    expect(historyRes.json).toHaveBeenCalledWith({ success: true, runs: [] });
    expect(alertsRes.json).toHaveBeenCalledWith({ success: true, alerts: [] });
  });

  it('awaits stop, acknowledge and resolve results', async () => {
    service.stop.mockResolvedValue({ status: 'STOPPED' });
    service.acknowledge.mockResolvedValue({ id: 'alert-1', status: 'ACKNOWLEDGED' });
    service.resolve.mockResolvedValue({ id: 'alert-2', status: 'RESOLVED' });
    const stopRes = response();
    const ackRes = response();
    const resolveRes = response();

    await rbFactorySalesAutonomyController.stop({} as any, stopRes);
    await rbFactorySalesAutonomyController.acknowledge({ params: { id: 'alert-1' } } as any, ackRes);
    await rbFactorySalesAutonomyController.resolve({ params: { id: 'alert-2' } } as any, resolveRes);

    expect(stopRes.json).toHaveBeenCalledWith({ success: true, result: { status: 'STOPPED' } });
    expect(ackRes.json).toHaveBeenCalledWith({ success: true, alert: { id: 'alert-1', status: 'ACKNOWLEDGED' } });
    expect(resolveRes.json).toHaveBeenCalledWith({ success: true, alert: { id: 'alert-2', status: 'RESOLVED' } });
  });

  it('maps missing alerts to 404 and unexpected failures to 500', async () => {
    service.acknowledge.mockRejectedValue(new Error('SELLER_ALERT_NOT_FOUND'));
    service.status.mockRejectedValue(new Error('database unavailable'));
    const alertRes = response();
    const statusRes = response();

    await rbFactorySalesAutonomyController.acknowledge({ params: { id: 'missing' } } as any, alertRes);
    await rbFactorySalesAutonomyController.status({} as any, statusRes);

    expect(alertRes.status).toHaveBeenCalledWith(404);
    expect(alertRes.json).toHaveBeenCalledWith({ success: false, error: 'SELLER_ALERT_NOT_FOUND' });
    expect(statusRes.status).toHaveBeenCalledWith(500);
    expect(statusRes.json).toHaveBeenCalledWith({ success: false, error: 'database unavailable' });
  });
});
