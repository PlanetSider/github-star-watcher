import type { FastifyInstance } from 'fastify';
import { SettingsService } from '../settings/settings.service';
import { RepoFilterService } from '../repos/repo-filter.service';

export async function registerHealthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async () => ({
    success: true,
    data: {
      status: 'ok',
      time: new Date().toISOString(),
    },
  }));

  app.get('/stats', async () => {
    const settingsService = new SettingsService(app.prisma);
    const repoFilterService = new RepoFilterService(settingsService);
    const filterMode = await settingsService.getFilterMode();

    const [repoCount, blacklistCount, whitelistCount, eventCount24h, lastSyncAt, lastPollAt] =
      await Promise.all([
        app.prisma.starredRepo.count(),
        app.prisma.starredRepo.count({ where: { listMode: 'blacklist' } }),
        app.prisma.starredRepo.count({ where: { listMode: 'whitelist' } }),
        app.prisma.repoEvent.count({
          where: {
            detectedAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
            },
          },
        }),
        settingsService.getLastSyncAt(),
        settingsService.getLastPollAt(),
      ]);

    const allRepos = await app.prisma.starredRepo.findMany({
      select: { listMode: true },
    });

    const monitoredRepoCount = allRepos.filter((repo) =>
      repoFilterService.shouldMonitor(repo.listMode, filterMode),
    ).length;

    return {
      success: true,
      data: {
        repoCount,
        monitoredRepoCount,
        blacklistCount,
        whitelistCount,
        eventCount24h,
        lastSyncAt,
        lastPollAt,
        filterMode,
      },
    };
  });
}
