import type { FastifyInstance } from 'fastify';
import { GithubClient } from '../github/github.client';
import { SettingsService } from '../settings/settings.service';
import { SnapshotsService } from '../snapshots/snapshots.service';
import { SyncService } from './sync.service';

export async function registerSyncRoutes(app: FastifyInstance): Promise<void> {
  app.post('/sync/starred', async () => {
    const githubClient = new GithubClient(app.env.GITHUB_TOKEN);
    const settingsService = new SettingsService(app.prisma);
    const snapshotsService = new SnapshotsService(app.prisma);
    const syncService = new SyncService(app.prisma, githubClient, snapshotsService, settingsService);

    return {
      success: true,
      data: await syncService.syncStarredRepos(),
    };
  });
}
