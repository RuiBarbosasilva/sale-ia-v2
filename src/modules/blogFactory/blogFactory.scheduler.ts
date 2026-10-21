import { runAutomationCycle } from './blogFactory.service';

let timer: NodeJS.Timeout | null = null;
let running = false;

export function startBlogFactoryScheduler() {
  if (timer || process.env.BLOG_FACTORY_AUTORUN_ENABLED !== 'true') return;
  const intervalMs = Math.max(5 * 60 * 1000, Number(process.env.BLOG_FACTORY_INTERVAL_MS) || 30 * 60 * 1000);
  const run = async () => {
    if (running) return;
    running = true;
    try {
      const result = await runAutomationCycle();
      console.log('[BLOG FACTORY] cycle complete', JSON.stringify({ fetched: result.fetched, newTopics: result.newTopics, generated: result.generated, errors: result.errors.length }));
    } catch (error) {
      console.error('[BLOG FACTORY] cycle failed:', error instanceof Error ? error.message : error);
    } finally {
      running = false;
    }
  };
  void run();
  timer = setInterval(() => { void run(); }, intervalMs);
}
