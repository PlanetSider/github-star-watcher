import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { SettingsService } from './settings.service';

const filterModeSchema = z.object({
  mode: z.enum(['all_except_blacklist', 'whitelist_only']),
});

export async function registerSettingsRoutes(app: FastifyInstance): Promise<void> {
  const settingsService = new SettingsService(app.prisma);

  app.get('/settings', async () => ({
    success: true,
    data: {
      filterMode: await settingsService.getFilterMode(),
      rssEnabled: await settingsService.isRssEnabled(),
    },
  }));

  app.post('/settings/filter-mode', async (request, reply) => {
    const parsed = filterModeSchema.safeParse(request.body);
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

    const filterMode = await settingsService.setFilterMode(parsed.data.mode);
    return {
      success: true,
      data: {
        filterMode,
      },
    };
  });

  app.get('/settings/rss', async () => {
    const data = await settingsService.getPublicSettings(app.env.BASE_URL);
    return {
      success: true,
      data: {
        enabled: data.rssEnabled,
        feedPath: data.rssFeedUrl ? new URL(data.rssFeedUrl).pathname : null,
      },
    };
  });

  app.post('/settings/rss/regenerate-token', async () => {
    const token = await settingsService.regenerateRssFeedToken();
    return {
      success: true,
      data: {
        feedPath: `/feeds/${token}/rss.xml`,
      },
    };
  });
}
