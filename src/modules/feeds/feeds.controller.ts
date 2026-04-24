import type { FastifyInstance } from 'fastify';
import { SettingsService } from '../settings/settings.service';
import { FeedsService } from './feeds.service';
import { RssRenderer } from './rss.renderer';

export async function registerFeedsRoutes(app: FastifyInstance): Promise<void> {
  const settingsService = new SettingsService(app.prisma);
  const feedsService = new FeedsService(app.prisma, settingsService, new RssRenderer());

  app.get('/feeds/:token/rss.xml', async (request, reply) => {
    const { token } = request.params as { token: string };
    const xml = await feedsService.renderFeed(token, app.env.BASE_URL, app.env.RSS_FEED_LIMIT);
    reply.type('application/rss+xml; charset=utf-8');
    return xml;
  });

  app.get('/feeds/:token/code-updated.xml', async (request, reply) => {
    const { token } = request.params as { token: string };
    const xml = await feedsService.renderFeed(token, app.env.BASE_URL, app.env.RSS_FEED_LIMIT, 'code_updated');
    reply.type('application/rss+xml; charset=utf-8');
    return xml;
  });

  app.get('/feeds/:token/releases.xml', async (request, reply) => {
    const { token } = request.params as { token: string };
    const xml = await feedsService.renderFeed(token, app.env.BASE_URL, app.env.RSS_FEED_LIMIT, 'release_published');
    reply.type('application/rss+xml; charset=utf-8');
    return xml;
  });
}
