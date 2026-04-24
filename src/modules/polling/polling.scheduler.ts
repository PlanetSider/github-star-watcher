import cron from 'node-cron';
import { logger } from '../../lib/logger';
import { PollingService } from './polling.service';

export class PollingScheduler {
  constructor(
    private readonly cronExpression: string,
    private readonly pollingService: PollingService,
  ) {}

  start(): void {
    cron.schedule(this.cronExpression, async () => {
      try {
        await this.pollingService.run();
      } catch (error: unknown) {
        logger.error('scheduled polling failed', {
          module: 'polling-scheduler',
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });
  }
}
