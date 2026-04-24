import type { PrismaClient } from '@prisma/client';
import { GithubClient } from '../github/github.client';
import { SettingsService } from '../settings/settings.service';
import { SnapshotsService } from '../snapshots/snapshots.service';

export type SyncStarredReposResult = {
  totalFetched: number;
  created: number;
  updated: number;
  removed: number;
  syncedAt: string;
};

export class SyncService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly githubClient: GithubClient,
    private readonly snapshotsService: SnapshotsService,
    private readonly settingsService: SettingsService,
  ) {}

  async syncStarredRepos(): Promise<SyncStarredReposResult> {
    const syncedAt = new Date();
    const remoteRepos = await this.githubClient.listAllStarredRepos();
    const remoteRepoIds = new Set(remoteRepos.map((repo) => repo.repoId));

    const existingRepos = await this.prisma.starredRepo.findMany({
      select: { repoId: true },
    });
    const existingRepoIds = new Set(existingRepos.map((repo) => repo.repoId));

    let created = 0;
    let updated = 0;

    for (const repo of remoteRepos) {
      const alreadyExists = existingRepoIds.has(repo.repoId);

      await this.prisma.starredRepo.upsert({
        where: { repoId: repo.repoId },
        update: {
          owner: repo.owner,
          name: repo.name,
          fullName: repo.fullName,
          htmlUrl: repo.htmlUrl,
          defaultBranch: repo.defaultBranch,
          isArchived: repo.isArchived,
          isDisabled: repo.isDisabled,
          starredAt: repo.starredAt ? new Date(repo.starredAt) : null,
        },
        create: {
          repoId: repo.repoId,
          owner: repo.owner,
          name: repo.name,
          fullName: repo.fullName,
          htmlUrl: repo.htmlUrl,
          defaultBranch: repo.defaultBranch,
          isArchived: repo.isArchived,
          isDisabled: repo.isDisabled,
          starredAt: repo.starredAt ? new Date(repo.starredAt) : null,
        },
      });

      await this.snapshotsService.ensureSnapshot(repo.repoId);

      if (alreadyExists) {
        updated += 1;
      } else {
        created += 1;
      }
    }

    const staleRepoIds = existingRepos
      .map((repo) => repo.repoId)
      .filter((repoId) => !remoteRepoIds.has(repoId));

    let removed = 0;
    if (staleRepoIds.length > 0) {
      const deleteResult = await this.prisma.starredRepo.deleteMany({
        where: {
          repoId: { in: staleRepoIds },
        },
      });

      removed = deleteResult.count;
    }

    await this.settingsService.setLastSyncAt(syncedAt.toISOString());

    return {
      totalFetched: remoteRepos.length,
      created,
      updated,
      removed,
      syncedAt: syncedAt.toISOString(),
    };
  }
}
