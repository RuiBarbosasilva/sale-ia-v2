describe('Blog Factory scheduler feature flag', () => {
  const originalAutorun = process.env.BLOG_FACTORY_AUTORUN_ENABLED;
  const originalInterval = process.env.BLOG_FACTORY_INTERVAL_MS;

  afterEach(() => {
    jest.useRealTimers();
    if (originalAutorun === undefined) delete process.env.BLOG_FACTORY_AUTORUN_ENABLED;
    else process.env.BLOG_FACTORY_AUTORUN_ENABLED = originalAutorun;
    if (originalInterval === undefined) delete process.env.BLOG_FACTORY_INTERVAL_MS;
    else process.env.BLOG_FACTORY_INTERVAL_MS = originalInterval;
    jest.resetModules();
  });

  it('does not schedule cycles unless autorun is explicitly enabled', () => {
    jest.useFakeTimers();
    delete process.env.BLOG_FACTORY_AUTORUN_ENABLED;
    const scheduler = require('../src/modules/blogFactory/blogFactory.scheduler');

    scheduler.startBlogFactoryScheduler();

    expect(jest.getTimerCount()).toBe(0);
  });

  it('starts one periodic cycle when autorun is explicitly enabled', () => {
    jest.useFakeTimers();
    process.env.BLOG_FACTORY_AUTORUN_ENABLED = 'true';
    process.env.BLOG_FACTORY_INTERVAL_MS = '60000';
    const scheduler = require('../src/modules/blogFactory/blogFactory.scheduler');

    scheduler.startBlogFactoryScheduler();
    scheduler.startBlogFactoryScheduler();

    expect(jest.getTimerCount()).toBe(1);
    scheduler.stopBlogFactoryScheduler();
    expect(jest.getTimerCount()).toBe(0);
  });

  it('treats false as disabled', () => {
    jest.useFakeTimers();
    process.env.BLOG_FACTORY_AUTORUN_ENABLED = 'false';
    const scheduler = require('../src/modules/blogFactory/blogFactory.scheduler');

    scheduler.startBlogFactoryScheduler();

    expect(jest.getTimerCount()).toBe(0);
  });
});
