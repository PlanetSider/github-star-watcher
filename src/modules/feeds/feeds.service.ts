import type { PrismaClient, RepoEventType } from '@prisma/client';
import { SettingsService } from '../settings/settings.service';
import { RssRenderer } from './rss.renderer';

type FeedEvent = Awaited<ReturnType<PrismaClient['repoEvent']['findMany']>>[number] & {
  repo: {
    fullName: string;
    htmlUrl: string;
  };
};

export class FeedsService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly settingsService: SettingsService,
    private readonly rssRenderer: RssRenderer,
  ) {}

  async renderFeed(
    token: string,
    baseUrl: string,
    limit: number,
    eventType: RepoEventType | undefined,
  ): Promise<string> {
    await this.settingsService.assertValidFeedToken(token);

    const where = eventType ? { eventType } : {};

    const events: FeedEvent[] = await this.prisma.repoEvent.findMany({
      where,
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
