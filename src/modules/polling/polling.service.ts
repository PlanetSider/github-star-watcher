import type { PrismaClient } from '@prisma/client';
import type { AppEnv } from '../../config/env';
import { GithubClient } from '../github/github.client';
import { EventsService } from '../events/events.service';
import { ServerChanNotifier } from '../notifications/serverchan.notifier';
import { NotificationService } from '../notifications/notification.service';
import { RepoFilterService } from '../repos/repo-filter.service';
import { SettingsService } from '../settings/settings.service';
import { SnapshotsService } from '../snapshots/snapshots.service';
import { SyncService } from '../sync/sync.service';
import { DiffService } from './diff.service';

export type PollRunResult = {
  checkedRepoCount: number;
  skippedRepoCount: number;
  newEvents: number;
  codeUpdatedCount: number;
  releasePublishedCount: number;
  serverchanMessagesSent: number;
  polledAt: string;
};

export class PollingService {
  private isRunning = false;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly githubClient: GithubClient,
    private readonly settingsService: SettingsService,
    private readonly repoFilterService: RepoFilterService,
    private readonly snapshotsService: SnapshotsService,
    private readonly syncService: SyncService,
    private readonly diffService: DiffService,
    private readonly eventsService: EventsService,
    private readonly notificationService: NotificationService,
  ) {}

  async run(): Promise<PollRunResult> {
    if (this.isRunning) {
      return {
        checkedRepoCount: 0,
        skippedRepoCount: 0,
        newEvents: 0,
        codeUpdatedCount: 0,
        releasePublishedCount: 0,
        serverchanMessagesSent: 0,
        polledAt: new Date().toISOString(),
      };
    }

    this.isRunning = true;

    try {
      await this.syncService.syncStarredRepos();

      const polledAt = new Date();
      const filterMode = await this.settingsService.getFilterMode();
      const repos = await this.prisma.starredRepo.findMany({
        include: { snapshot: true },
        orderBy: { fullName: 'asc' },
      });

      const monitoredRepos = repos.filter((repo) =>
        this.repoFilterService.shouldMonitor(repo.listMode, filterMode),
      );

      const createdEvents: Array<{
        id: number;
        eventType: 'code_updated' | 'release_published';
        repo: { fullName: string };
      }> = [];

      for (const repo of monitoredRepos) {
        try {
          const repoState = await this.githubClient.getRepoState(repo.owner, repo.name);
          const latestRelease = await this.githubClient.getLatestRelease(repo.owner, repo.name);

          const currentState = {
            pushedAt: repoState.pushedAt ? new Date(repoState.pushedAt) : null,
            latestReleaseId: latestRelease?.releaseId ?? null,
            latestReleaseTag: latestRelease?.tagName ?? null,
            latestReleasePublishedAt: latestRelease?.publishedAt ? new Date(latestRelease.publishedAt) : null,
          };

          const diffEvents = this.diffService.diff(
            repo.snapshot,
            currentState,
            { fullName: repo.fullName, htmlUrl: repo.htmlUrl },
            latestRelease?.htmlUrl ?? `${repo.htmlUrl}/releases`,
          );

          const savedEvents = await this.eventsService.createMany(
            diffEvents.map((event) => ({
              repoId: repo.repoId,
              eventType: event.eventType,
              fingerprint: event.fingerprint,
              title: event.title,
              link: event.link,
              payloadJson: event.payloadJson,
            })),
          );

          for (const event of savedEvents) {
            createdEvents.push({
              id: event.id,
              eventType: event.eventType,
              repo: { fullName: repo.fullName },
            });
          }

          await this.snapshotsService.updateSnapshot(repo.repoId, {
            pushedAt: currentState.pushedAt,
            latestReleaseId: currentState.latestReleaseId,
            latestReleaseTag: currentState.latestReleaseTag,
            latestReleasePublishedAt: currentState.latestReleasePublishedAt,
            lastCheckedAt: polledAt,
          });
        } catch {
          continue;
        }
      }

      const eventIds = createdEvents.map((event) => event.id);
      const hydratedEvents = eventIds.length
        ? await this.prisma.repoEvent.findMany({
            where: { id: { in: eventIds } },
            include: { repo: { select: { fullName: true } } },
          })
        : [];

      const serverchanMessagesSent = await this.notificationService.notifyForEvents(hydratedEvents);
      await this.settingsService.setLastPollAt(polledAt.toISOString());

      return {
        checkedRepoCount: monitoredRepos.length,
        skippedRepoCount: repos.length - monitoredRepos.length,
        newEvents: createdEvents.length,
        codeUpdatedCount: createdEvents.filter((event) => event.eventType === 'code_updated').length,
        releasePublishedCount: createdEvents.filter((event) => event.eventType === 'release_published').length,
        serverchanMessagesSent,
        polledAt: polledAt.toISOString(),
      };
    } finally {
      this.isRunning = false;
    }
  }
}

export function createPollingService(prisma: PrismaClient, env: AppEnv): PollingService {
  const githubClient = new GithubClient(env.GITHUB_TOKEN);
  const settingsService = new SettingsService(prisma);
  const repoFilterService = new RepoFilterService(settingsService);
  const snapshotsService = new SnapshotsService(prisma);
  const syncService = new SyncService(prisma, githubClient, snapshotsService, settingsService);
  const diffService = new DiffService();
  const eventsService = new EventsService(prisma);
  const notificationService = env.SERVERCHAN_SENDKEY
    ? new NotificationService(new ServerChanNotifier(env.SERVERCHAN_SENDKEY), eventsService)
    : new NotificationService(
        {
          async send(): Promise<void> {
            return;
          },
        },
        eventsService,
      );

  return new PollingService(
    prisma,
    githubClient,
    settingsService,
    repoFilterService,
    snapshotsService,
    syncService,
    diffService,
    eventsService,
    notificationService,
  );
}
