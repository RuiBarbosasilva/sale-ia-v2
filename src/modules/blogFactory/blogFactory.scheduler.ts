import { blogFactoryService } from './blogFactory.service';

let timer: ReturnType<typeof setInterval> | undefined;
let running = false;

export class BlogFactoryScheduler {
  async runCycle() {
    if (running) return { skipped: true, reason: 'CYCLE_ALREADY_RUNNING' };
    running = true;
    try {
      const result = await blogFactoryService.runAutomationCycle();
      console.log('[BlogFactory] Ciclo concluído:', JSON.stringify({
        topicsConsidered: result.topicsConsidered,
        generated: result.generatedArticleIds.length,
        failures: result.failures.length
      }));
      return result;
    } catch (error) {
      console.error('[BlogFactory] Ciclo falhou:', error instanceof Error ? error.message : error);
      throw error;
    } finally {
      running = false;
    }
  }
}

export const blogFactoryScheduler = new BlogFactoryScheduler();

export function startBlogFactoryScheduler() {
  if (String(process.env.BLOG_FACTORY_AUTORUN_ENABLED || '').toLowerCase() !== 'true') {
    console.log('[BlogFactory] Scheduler desativado; defina BLOG_FACTORY_AUTORUN_ENABLED=true para ativar.');
    return;
  }
  if (timer) return;
  const configured = Number(process.env.BLOG_FACTORY_INTERVAL_MS || 6 * 60 * 60 * 1000);
  const interval = Number.isFinite(configured) ? Math.min(Math.max(configured, 60_000), 7 * 24 * 60 * 60 * 1000) : 6 * 60 * 60 * 1000;
  timer = setInterval(() => {
    void blogFactoryScheduler.runCycle().catch(() => undefined);
  }, interval);
  if (typeof timer === 'object' && 'unref' in timer) timer.unref();
  console.log('[BlogFactory] Scheduler ativo. Intervalo (ms):', interval);
}

export function stopBlogFactoryScheduler() {
  if (timer) clearInterval(timer);
  timer = undefined;
}
