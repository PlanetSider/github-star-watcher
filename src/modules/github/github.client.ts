import { Octokit } from 'octokit';
import { AppError } from '../../lib/errors';
import type { GithubLatestRelease, GithubRepoState, GithubStarredRepo } from './github.types';

type StatusError = Error & { status?: number };
type StarredResponseItem = Awaited<ReturnType<Octokit['paginate']>>[number];

export class GithubClient {
  private readonly octokit: Octokit;

  constructor(token: string) {
    this.octokit = new Octokit({ auth: token });
  }

  async listAllStarredRepos(): Promise<GithubStarredRepo[]> {
    try {
      const items = await this.octokit.paginate('GET /user/starred', {
        per_page: 100,
        sort: 'updated',
        direction: 'desc',
        headers: {
          accept: 'application/vnd.github.star+json',
        },
      });

      return items.map((item: StarredResponseItem) => ({
        repoId: String(item.repo.id),
        owner: item.repo.owner.login,
        name: item.repo.name,
        fullName: item.repo.full_name,
        htmlUrl: item.repo.html_url,
        defaultBranch: item.repo.default_branch ?? null,
        isArchived: item.repo.archived,
        isDisabled: item.repo.disabled ?? false,
        starredAt: item.starred_at ?? null,
      }));
    } catch (error: unknown) {
      throw this.mapGithubError(error);
    }
  }

  async getRepoState(owner: string, repo: string): Promise<GithubRepoState> {
    try {
      const response = await this.octokit.request('GET /repos/{owner}/{repo}', {
        owner,
        repo,
      });

      return {
        repoId: String(response.data.id),
        fullName: response.data.full_name,
        htmlUrl: response.data.html_url,
        defaultBranch: response.data.default_branch ?? null,
        pushedAt: response.data.pushed_at ?? null,
      };
    } catch (error: unknown) {
      throw this.mapGithubError(error);
    }
  }

  async getLatestRelease(owner: string, repo: string): Promise<GithubLatestRelease | null> {
    try {
      const response = await this.octokit.request('GET /repos/{owner}/{repo}/releases/latest', {
        owner,
        repo,
      });

      return {
        releaseId: String(response.data.id),
        tagName: response.data.tag_name ?? null,
        htmlUrl: response.data.html_url ?? null,
        publishedAt: response.data.published_at ?? null,
      };
    } catch (error: unknown) {
      if (this.getStatus(error) === 404) {
        return null;
      }

      throw this.mapGithubError(error);
    }
  }

  private getStatus(error: unknown): number | undefined {
    if (error instanceof Error) {
      return (error as StatusError).status;
    }

    return undefined;
  }

  private mapGithubError(error: unknown): AppError {
    const status = this.getStatus(error);

    if (status === 401) {
      return new AppError(401, 'GITHUB_UNAUTHORIZED', 'GitHub token is invalid or expired');
    }

    if (status === 403) {
      return new AppError(403, 'GITHUB_FORBIDDEN', 'GitHub request is forbidden or rate limited');
    }

    if (status === 429) {
      return new AppError(429, 'GITHUB_RATE_LIMITED', 'GitHub API rate limit exceeded');
    }

    return new AppError(502, 'GITHUB_REQUEST_FAILED', 'GitHub API request failed');
  }
}
