import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { SettingsService } from '../settings/settings.service';
import { RepoFilterService } from './repo-filter.service';
import { ReposService } from './repos.service';

const listReposQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  listMode: z.enum(['none', 'blacklist', 'whitelist']).optional(),
  monitored: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === 'true')),
});

const reasonSchema = z.object({
  reason: z.string().trim().min(1).max(200).optional(),
});

export async function registerReposRoutes(app: FastifyInstance): Promise<void> {
  const settingsService = new SettingsService(app.prisma);
  const repoFilterService = new RepoFilterService(settingsService);
  const reposService = new ReposService(app.prisma, repoFilterService);

  app.get('/repos', async (request, reply) => {
    const parsed = listReposQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Request validation failed',
          details: parsed.error.flatten(),
        },
      });
    }

    const result = await reposService.listRepos(parsed.data);
    return {
      success: true,
      data: { items: result.items },
      meta: {
        page: parsed.data.page,
        pageSize: parsed.data.pageSize,
        total: result.total,
        totalPages: Math.ceil(result.total / parsed.data.pageSize),
      },
    };
  });

  app.get('/repos/:repoId', async (request) => {
    const { repoId } = request.params as { repoId: string };
    return {
      success: true,
      data: await reposService.getRepo(repoId),
    };
  });

  app.post('/repos/:repoId/blacklist', async (request, reply) => {
    const parsed = reasonSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Request validation failed',
          details: parsed.error.flatten(),
        },
      });
    }

    const { repoId } = request.params as { repoId: string };
    return {
      success: true,
      data: await reposService.setListMode(repoId, 'blacklist', parsed.data.reason),
    };
  });

  app.post('/repos/:repoId/whitelist', async (request, reply) => {
    const parsed = reasonSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Request validation failed',
          details: parsed.error.flatten(),
        },
      });
    }

    const { repoId } = request.params as { repoId: string };
    return {
      success: true,
      data: await reposService.setListMode(repoId, 'whitelist', parsed.data.reason),
    };
  });

  app.post('/repos/:repoId/clear-list', async (request) => {
    const { repoId } = request.params as { repoId: string };
    return {
      success: true,
      data: await reposService.setListMode(repoId, 'none'),
    };
  });
}
