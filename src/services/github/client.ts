import { env, getGithubRepoApiPath } from "@/lib/env";

const githubApiBaseUrl = "https://api.github.com";

export type GithubCommitPayload = {
  sha: string;
  commit: {
    message: string;
    author?: {
      date?: string;
      name?: string;
    };
  };
  html_url: string;
};

export type GithubPullRequestPayload = {
  id: number;
  number: number;
  title: string;
  body: string | null;
  merged_at: string | null;
  updated_at: string;
  html_url: string;
  state: string;
  draft: boolean;
};

export type GithubIssuePayload = {
  id: number;
  number: number;
  title: string;
  body: string | null;
  updated_at: string;
  html_url: string;
  pull_request?: {
    url: string;
  };
};

export type GithubReleasePayload = {
  id: number;
  tag_name: string;
  name: string | null;
  body: string | null;
  html_url: string;
  published_at: string | null;
  created_at: string | null;
};

export type GithubWebhookPayload = {
  id: number;
  active: boolean;
  config?: {
    url?: string;
  };
};

async function githubRequest<T>(path: string, init?: RequestInit) {
  if (!env.GITHUB_TOKEN) {
    throw new Error("GITHUB_TOKEN is not configured");
  }

  const response = await fetch(`${githubApiBaseUrl}${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      "User-Agent": "SignalToPost",
      "X-GitHub-Api-Version": "2022-11-28",
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`GitHub request failed: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as T;
}

export function getGithubClient() {
  return {
    listCommits(repoName: string, perPage = 5, range?: { since?: Date; until?: Date }) {
      const params = new URLSearchParams({ per_page: String(perPage) });
      if (range?.since) params.set("since", range.since.toISOString());
      if (range?.until) params.set("until", range.until.toISOString());
      return githubRequest<GithubCommitPayload[]>(`/repos/${getGithubRepoApiPath(repoName)}/commits?${params}`);
    },
    listPullRequests(repoName: string, perPage = 5) {
      return githubRequest<GithubPullRequestPayload[]>(
        `/repos/${getGithubRepoApiPath(repoName)}/pulls?state=closed&sort=updated&direction=desc&per_page=${perPage}`,
      );
    },
    listIssues(repoName: string, perPage = 5) {
      return githubRequest<GithubIssuePayload[]>(
        `/repos/${getGithubRepoApiPath(repoName)}/issues?state=all&sort=updated&direction=desc&per_page=${perPage}`,
      );
    },
    getRepo(repoName: string) {
      return githubRequest<{ full_name: string; description: string | null }>(
        `/repos/${getGithubRepoApiPath(repoName)}`,
      );
    },
    listReleases(repoName: string, perPage = 5) {
      return githubRequest<GithubReleasePayload[]>(
        `/repos/${getGithubRepoApiPath(repoName)}/releases?per_page=${perPage}`,
      );
    },
    listWebhooks(repoName: string) {
      return githubRequest<GithubWebhookPayload[]>(`/repos/${getGithubRepoApiPath(repoName)}/hooks?per_page=100`);
    },
    updateWebhook(repoName: string, hookId: number, input: { active: boolean }) {
      return githubRequest<GithubWebhookPayload>(`/repos/${getGithubRepoApiPath(repoName)}/hooks/${hookId}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      });
    },
  };
}
