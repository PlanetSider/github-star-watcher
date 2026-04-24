import Fastify from 'fastify';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import type { AppEnv } from './config/env';
import { isAppError } from './lib/errors';
import { setLogLevel } from './lib/logger';
import { createPrismaClient } from './plugins/prisma';
import { registerEventsRoutes } from './modules/events/events.controller';
import { registerFeedsRoutes } from './modules/feeds/feeds.controller';
import { registerHealthRoutes } from './modules/health/health.controller';
import { registerPollingRoutes } from './modules/polling/polling.controller';
import { registerReposRoutes } from './modules/repos/repos.controller';
import { registerSettingsRoutes } from './modules/settings/settings.controller';
import { SettingsService } from './modules/settings/settings.service';
import { registerSyncRoutes } from './modules/sync/sync.controller';

export async function createApp(env: AppEnv) {
  setLogLevel(env.LOG_LEVEL);
  const app = Fastify({ logger: false });
  const prisma = createPrismaClient();

  app.decorate('prisma', prisma);
  app.decorate('env', env);

  await app.register(sensible);
  await app.register(cors, { origin: env.CORS_ORIGIN ? env.CORS_ORIGIN : false });

  const settingsService = new SettingsService(prisma);
  await settingsService.initializeDefaults(env);

  app.addHook('onRequest', async (request, reply) => {
    if (request.method === 'OPTIONS' || request.url === '/health') {
      return;
    }

    if (request.url.startsWith('/feeds/')) {
      return;
    }

    const header = request.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or invalid authorization header',
        },
      });
    }

    const token = header.slice('Bearer '.length);
    if (token !== env.API_AUTH_TOKEN) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid API token',
        },
      });
    }
  });

  await registerHealthRoutes(app);
  await registerSettingsRoutes(app);
  await registerSyncRoutes(app);
  await registerReposRoutes(app);
  await registerPollingRoutes(app);
  await registerEventsRoutes(app);
  await registerFeedsRoutes(app);

  app.setErrorHandler((error, _request, reply) => {
    if (isAppError(error)) {
      return reply.status(error.statusCode).send({
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      });
    }

    return reply.status(500).send({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
  });

  app.addHook('onClose', async () => {
    await prisma.$disconnect();
  });

  return app;
}
