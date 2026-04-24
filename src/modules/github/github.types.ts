export type GithubStarredRepo = {
  repoId: string;
  owner: string;
  name: string;
  fullName: string;
  htmlUrl: string;
  defaultBranch: string | null;
  isArchived: boolean;
  isDisabled: boolean;
  starredAt: string | null;
};

export type GithubRepoState = {
  repoId: string;
  fullName: string;
  htmlUrl: string;
  defaultBranch: string | null;
  pushedAt: string | null;
};

export type GithubLatestRelease = {
  releaseId: string;
  tagName: string | null;
  htmlUrl: string | null;
  publishedAt: string | null;
};
