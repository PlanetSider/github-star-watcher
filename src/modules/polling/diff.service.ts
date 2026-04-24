import type { RepoSnapshot } from '@prisma/client';

type CurrentState = {
  pushedAt: Date | null;
  latestReleaseId: string | null;
  latestReleaseTag: string | null;
  latestReleasePublishedAt: Date | null;
};

type DiffEvent = {
  eventType: 'code_updated' | 'release_published';
  fingerprint: string;
  title: string;
  link: string | null;
  payloadJson: string | null;
};

export class DiffService {
  diff(
    snapshot: RepoSnapshot | null,
    current: CurrentState,
    repo: { fullName: string; htmlUrl: string },
    releaseUrl: string | null,
  ): DiffEvent[] {
    if (!snapshot || !snapshot.lastCheckedAt) {
      return [];
    }

    const events: DiffEvent[] = [];

    const snapshotPushedAt = snapshot.pushedAt?.toISOString() ?? null;
    const currentPushedAt = current.pushedAt?.toISOString() ?? null;
    if (snapshotPushedAt !== currentPushedAt && currentPushedAt) {
      events.push({
        eventType: 'code_updated',
        fingerprint: `${repo.fullName}:code_updated:${currentPushedAt}`,
        title: `[代码更新] ${repo.fullName}`,
        link: repo.htmlUrl,
        payloadJson: JSON.stringify({ pushedAt: currentPushedAt }),
      });
    }

    if (snapshot.latestReleaseId !== current.latestReleaseId && current.latestReleaseId) {
      events.push({
        eventType: 'release_published',
        fingerprint: `${repo.fullName}:release_published:${current.latestReleaseId}`,
        title: `[版本发布] ${repo.fullName} ${current.latestReleaseTag ?? ''}`.trim(),
        link: releaseUrl,
        payloadJson: JSON.stringify({
          latestReleaseId: current.latestReleaseId,
          latestReleaseTag: current.latestReleaseTag,
          latestReleasePublishedAt: current.latestReleasePublishedAt?.toISOString() ?? null,
        }),
      });
    }

    return events;
  }
}
