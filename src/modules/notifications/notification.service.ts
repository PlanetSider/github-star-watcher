import type { RepoEvent } from '@prisma/client';
import { EventsService } from '../events/events.service';
import type { Notifier } from './notifier.interface';

type RepoEventWithRepo = RepoEvent & {
  repo: {
    fullName: string;
  };
};

export class NotificationService {
  constructor(
    private readonly notifier: Notifier,
    private readonly eventsService: EventsService,
  ) {}

  async notifyForEvents(events: RepoEventWithRepo[]): Promise<number> {
    const codeUpdated = events.filter((event) => event.eventType === 'code_updated');
    const releases = events.filter((event) => event.eventType === 'release_published');

    let sent = 0;

    if (codeUpdated.length > 0) {
      await this.notifier.send({
        title: `[GitHub Star] ${codeUpdated.length} 个项目有代码更新`,
        short: `${codeUpdated.length} repositories changed`,
        tags: 'github|stars|code',
        desp: ['### 代码更新', ...codeUpdated.map((event) => `- ${event.repo.fullName}`)].join('\n'),
      });
      await this.eventsService.markNotified(codeUpdated.map((event) => event.id));
      sent += 1;
    }

    if (releases.length > 0) {
      await this.notifier.send({
        title: `[GitHub Star] ${releases.length} 个项目发布新版本`,
        short: `${releases.length} releases published`,
        tags: 'github|stars|release',
        desp: ['### 新版本发布', ...releases.map((event) => `- ${event.repo.fullName}`)].join('\n'),
      });
      await this.eventsService.markNotified(releases.map((event) => event.id));
      sent += 1;
    }

    return sent;
  }
}
