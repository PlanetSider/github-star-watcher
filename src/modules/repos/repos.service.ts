import type { Prisma, PrismaClient } from '@prisma/client';
import { AppError } from '../../lib/errors';
import { RepoFilterService } from './repo-filter.service';
import type { RepoListMode } from './repos.types';

type ListReposInput = {
  page: number;
  pageSize: number;
  search: string | undefined;
  listMode: RepoListMode | undefined;
  monitored: boolean | undefined;
};

export class ReposService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly repoFilterService: RepoFilterService,
  ) {}

  async listRepos(input: ListReposInput) {
    const filterMode = await this.repoFilterService.getFilterMode();
    const where = this.buildWhere(input, filterMode);

    const [total, items] = await Promise.all([
      this.prisma.starredRepo.count({ where }),
      this.prisma.starredRepo.findMany({
        where,
        include: {
          snapshot: true,
        },
        orderBy: { fullName: 'asc' },
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
      }),
    ]);

    return {
      items: items.map((repo) => ({
        repoId: repo.repoId,
        owner: repo.owner,
        name: repo.name,
        fullName: repo.fullName,
        htmlUrl: repo.htmlUrl,
        defaultBranch: repo.defaultBranch,
        listMode: repo.listMode,
        listReason: repo.listReason,
        isMonitored: this.repoFilterService.shouldMonitor(repo.listMode, filterMode),
        starredAt: repo.starredAt?.toISOString() ?? null,
        lastCheckedAt: repo.snapshot?.lastCheckedAt?.toISOString() ?? null,
        lastPushedAt: repo.snapshot?.pushedAt?.toISOString() ?? null,
        latestReleaseTag: repo.snapshot?.latestReleaseTag ?? null,
      })),
      total,
    };
  }

  async getRepo(repoId: string) {
    const filterMode = await this.repoFilterService.getFilterMode();
    const repo = await this.prisma.starredRepo.findUnique({
      where: { repoId },
      include: { snapshot: true },
    });

    if (!repo) {
      throw new AppError(404, 'REPO_NOT_FOUND', 'Repository not found');
    }

    return {
      repoId: repo.repoId,
      owner: repo.owner,
      name: repo.name,
      fullName: repo.fullName,
      htmlUrl: repo.htmlUrl,
      defaultBranch: repo.defaultBranch,
      listMode: repo.listMode,
      listReason: repo.listReason,
      listedAt: repo.listedAt?.toISOString() ?? null,
      isMonitored: this.repoFilterService.shouldMonitor(repo.listMode, filterMode),
      snapshot: {
        pushedAt: repo.snapshot?.pushedAt?.toISOString() ?? null,
        latestReleaseId: repo.snapshot?.latestReleaseId ?? null,
        latestReleaseTag: repo.snapshot?.latestReleaseTag ?? null,
        latestReleasePublishedAt: repo.snapshot?.latestReleasePublishedAt?.toISOString() ?? null,
        lastCheckedAt: repo.snapshot?.lastCheckedAt?.toISOString() ?? null,
      },
    };
  }

  async setListMode(repoId: string, listMode: RepoListMode, reason?: string) {
    const existing = await this.prisma.starredRepo.findUnique({ where: { repoId } });

    if (!existing) {
      throw new AppError(404, 'REPO_NOT_FOUND', 'Repository not found');
    }

    const listedAt = listMode === 'none' ? null : new Date();
    const listReason = listMode === 'none' ? null : reason ?? null;

    const repo = await this.prisma.starredRepo.update({
      where: { repoId },
      data: {
        listMode,
        listReason,
        listedAt,
      },
    });

    return {
      repoId: repo.repoId,
      listMode: repo.listMode,
      listReason: repo.listReason,
    };
  }

  private buildWhere(input: ListReposInput, filterMode: 'all_except_blacklist' | 'whitelist_only'): Prisma.StarredRepoWhereInput {
    const where: Prisma.StarredRepoWhereInput = {};

    if (input.search) {
      where.OR = [
        { fullName: { contains: input.search } },
        { owner: { contains: input.search } },
        { name: { contains: input.search } },
      ];
    }

    if (input.listMode) {
      where.listMode = input.listMode;
    }

    if (input.monitored === true) {
      where.listMode = filterMode === 'whitelist_only' ? 'whitelist' : { not: 'blacklist' };
    }

    if (input.monitored === false) {
      where.listMode = filterMode === 'whitelist_only' ? { not: 'whitelist' } : 'blacklist';
    }

    return where;
  }
}
