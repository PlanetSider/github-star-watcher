import type { PrismaClient } from '@prisma/client';
import type { AppEnv } from '../config/env';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
    env: AppEnv;
  }

  interface FastifyRequest {
    authTokenVerified?: boolean;
  }
}
