import type { RepoEvent, RepoEventType } from '@prisma/client';
import { escapeXml, toRfc2822 } from '../../lib/rss';

type RepoEventWithRepo = RepoEvent & {
  repo: {
    fullName: string;
    htmlUrl: string;
  };
};

export class RssRenderer {
  render(params: {
    title: string;
    description: string;
    link: string;
    events: RepoEventWithRepo[];
    eventType: RepoEventType | undefined;
  }): string {
    const latestDate = params.events[0]?.detectedAt ?? new Date();

    const items = params.events
      .map((event) => {
        const fallbackLink =
          event.eventType === 'release_published' ? `${event.repo.htmlUrl}/releases` : event.repo.htmlUrl;

        const description = event.payloadJson
          ? escapeXml(event.payloadJson)
          : escapeXml(`${event.eventType} detected for ${event.repo.fullName}`);

        return `
      <item>
        <guid>repo-event-${event.id}</guid>
        <title>${escapeXml(event.title)}</title>
        <link>${escapeXml(event.link ?? fallbackLink)}</link>
        <pubDate>${toRfc2822(event.detectedAt)}</pubDate>
        <description>${description}</description>
      </item>`;
      })
      .join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(params.title)}</title>
    <description>${escapeXml(params.description)}</description>
    <link>${escapeXml(params.link)}</link>
    <language>zh-cn</language>
    <lastBuildDate>${toRfc2822(latestDate)}</lastBuildDate>${items}
  </channel>
</rss>`;
  }
}
