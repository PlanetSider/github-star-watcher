import type { PrismaClient, RepoEventType } from '@prisma/client';
import { SettingsService } from '../settings/settings.service';
import { RssRenderer } from './rss.renderer';

export class FeedsService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly settingsService: SettingsService,
    private readonly rssRenderer: RssRenderer,
  ) {}

  async renderFeed(token: string, baseUrl: string, limit: number, eventType?: RepoEventType): Promise<string> {
    await this.settingsService.assertValidFeedToken(token);

    const events = await this.prisma.repoEvent.findMany({
      where: eventType ? { eventType } : undefined,
      include: {
        repo: {
          select: {
            fullName: true,
            htmlUrl: true,
          },
        },
      },
      orderBy: { detectedAt: 'desc' },
      take: limit,
    });

    const title =
      eventType === 'code_updated'
        ? 'GitHub Star Code Updates'
        : eventType === 'release_published'
          ? 'GitHub Star Release Updates'
          : 'GitHub Star Updates';

    return this.rssRenderer.render({
      title,
      description: 'Updates from monitored GitHub starred repositories',
      link: baseUrl,
      events,
      eventType,
    });
  }
}
