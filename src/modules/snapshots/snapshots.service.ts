import type { PrismaClient } from '@prisma/client';

export type SnapshotState = {
  pushedAt: Date | null;
  latestReleaseId: string | null;
  latestReleaseTag: string | null;
  latestReleasePublishedAt: Date | null;
  lastCheckedAt: Date;
};

export class SnapshotsService {
  constructor(private readonly prisma: PrismaClient) {}

  async ensureSnapshot(repoId: string): Promise<void> {
    const existing = await this.prisma.repoSnapshot.findUnique({ where: { repoId } });
    if (!existing) {
      await this.prisma.repoSnapshot.create({
        data: {
          repoId,
        },
      });
    }
  }

  async updateSnapshot(repoId: string, state: SnapshotState): Promise<void> {
    await this.prisma.repoSnapshot.upsert({
      where: { repoId },
      update: state,
      create: {
        repoId,
        ...state,
      },
    });
  }
}
