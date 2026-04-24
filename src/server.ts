import { createApp } from './app';
import { loadEnv } from './config/env';
import { logger } from './lib/logger';
import { createPollingService } from './modules/polling/polling.service';
import { PollingScheduler } from './modules/polling/polling.scheduler';

async function main(): Promise<void> {
  const env = loadEnv();
  const app = await createApp(env);

  try {
    await app.listen({
      host: '0.0.0.0',
      port: env.APP_PORT,
    });

    const pollingService = createPollingService(app.prisma, env);
    const scheduler = new PollingScheduler(env.POLL_CRON, pollingService);
    scheduler.start();

    logger.info('server started', {
      module: 'server',
      port: env.APP_PORT,
      baseUrl: env.BASE_URL,
    });
  } catch (error: unknown) {
    logger.error('failed to start server', {
      module: 'server',
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
}

void main();
