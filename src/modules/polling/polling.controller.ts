import type { FastifyInstance } from 'fastify';
import { createPollingService } from './polling.service';

export async function registerPollingRoutes(app: FastifyInstance): Promise<void> {
  app.post('/poll/run', async () => ({
    success: true,
    data: await createPollingService(app.prisma, app.env).run(),
  }));
}
