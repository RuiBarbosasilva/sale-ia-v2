import { rbFactorySiteMaintenanceService } from '../services/website/rbFactorySiteMaintenanceService';

let timer: NodeJS.Timeout | null = null;

export function startRbFactoryMaintenanceJob() {
  if (timer) return;
  const intervalMs = Math.max(15 * 60 * 1000, Number(process.env.RB_FACTORY_MAINTENANCE_INTERVAL_MS) || 6 * 60 * 60 * 1000);
  const run = async () => {
    try {
      const created = await rbFactorySiteMaintenanceService.generateDueSuggestions(100);
      if (created.length) console.log(`[RB Factory Maintenance] ${created.length} sugestões geradas`);
    } catch (error: any) {
      console.error('[RB Factory Maintenance] erro:', error?.message || error);
    }
  };
  void run();
  timer = setInterval(run, intervalMs);
}
