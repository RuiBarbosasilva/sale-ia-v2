import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';

const isTestEnvironment =
  process.env.NODE_ENV === 'test' ||
  !!process.env.JEST_WORKER_ID;

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

/*
 * IMPORTANTE:
 * Em ambiente de teste NAO criamos IORedis, Queue ou Worker.
 *
 * Isso evita:
 * - TCPWRAP
 * - ECONNRESET
 * - handles abertos
 * - logs Redis depois dos testes
 *
 * Em producao, o comportamento permanece normal.
 */

type QueueLike = {
  add: (...args: any[]) => Promise<any>;
  getJobs: (...args: any[]) => Promise<any[]>;
  getJobCounts: (...args: any[]) => Promise<any>;
  clean: (...args: any[]) => Promise<any[]>;
  obliterate: (...args: any[]) => Promise<any>;
  close: () => Promise<void>;
};

const createDisabledQueue = (name: string): QueueLike => ({
  add: async (...args: any[]) => {
    return {
      id: `test-${name}`,
      name: args[0] || 'test',
      data: args[1] || {}
    };
  },

  getJobs: async () => [],

  getJobCounts: async () => ({
    waiting: 0,
    active: 0,
    completed: 0,
    failed: 0,
    delayed: 0,
    paused: 0
  }),

  clean: async () => [],

  obliterate: async () => undefined,

  close: async () => undefined
});

let connection: IORedis | null = null;

export const prospectQueue: QueueLike = isTestEnvironment
  ? createDisabledQueue('prospect')
  : new Queue('prospect', {
      connection: (() => {
        connection = new IORedis(redisUrl, {
          maxRetriesPerRequest: null,
          enableReadyCheck: false
        });

        connection.on('error', () => {
          console.warn(
            '[REDIS] Conexao falhou. Verifique se o Redis esta rodando. Jobs em background desativados temporariamente.'
          );
        });

        connection.on('connect', () => {
          console.log('[REDIS] Conectado com sucesso!');
        });

        return connection;
      })()
    });

export const campaignQueue: QueueLike = isTestEnvironment
  ? createDisabledQueue('campaign')
  : new Queue('campaign', {
      connection: connection!
    });

export const followUpQueue: QueueLike = isTestEnvironment
  ? createDisabledQueue('followup')
  : new Queue('followup', {
      connection: connection!
    });

export function initializeWorkers() {
  if (isTestEnvironment) {
    return {
      prospectWorker: null,
      campaignWorker: null,
      followUpWorker: null
    };
  }

  try {
    const prospectWorker = new Worker(
      'prospect',
      async (job) => {
        console.log('[PROSPECT] Processando job:', job.name);
        return { processed: true };
      },
      { connection: connection! }
    );

    const campaignWorker = new Worker(
      'campaign',
      async (job) => {
        console.log('[CAMPAIGN] Processando job:', job.name);
        return { processed: true };
      },
      { connection: connection! }
    );

    const followUpWorker = new Worker(
      'followup',
      async (job) => {
        console.log('[FOLLOWUP] Processando job:', job.name);
        return { processed: true };
      },
      { connection: connection! }
    );

    console.log('[WORKERS] Inicializados com sucesso.');

    return {
      prospectWorker,
      campaignWorker,
      followUpWorker
    };
  } catch (error) {
    console.warn(
      '[WORKERS] Nao foi possivel inicializar. O restante do sistema continuara funcionando.'
    );

    return {
      prospectWorker: null,
      campaignWorker: null,
      followUpWorker: null
    };
  }
}

export const closeRedis = async () => {
  if (!connection) {
    return;
  }

  try {
    if (connection.status !== 'end') {
      await connection.quit();
    }
  } catch {
    try {
      connection.disconnect();
    } catch {
      // Conexao ja encerrada.
    }
  } finally {
    connection = null;
  }
};
