import { GithubEventType, IdeaSource } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getConfiguredGithubRepos } from "@/lib/env";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import {
  getGithubClient,
  type GithubCommitPayload,
  type GithubIssuePayload,
  type GithubPullRequestPayload,
} from "@/services/github/client";
import { fingerprintGithubEvent } from "@/services/github/fingerprints";
import { summarizeGithubEvent } from "@/services/github/summarize";

type IngestResult = {
  synced: number;
  ideasCreated: number;
  repos: string[];
};

export type GithubEventCandidate = {
  repoName: string;
  eventType: GithubEventType;
  title: string;
  body: string | null;
  eventTimestamp: Date;
  fingerprint: string;
};

export async function ingestGithubEvents() {
  const user = await prisma.user.findFirst();
  const repos = getConfiguredGithubRepos();

  if (!user) {
    return { synced: 0, ideasCreated: 0, repos, reason: "no_user" } as IngestResult & {
      reason: string;
    };
  }

  if (repos.length === 0) {
    return { synced: 0, ideasCreated: 0, repos, reason: "no_repos" } as IngestResult & {
      reason: string;
    };
  }

  const client = getGithubClient();
  let synced = 0;
  let ideasCreated = 0;

  for (const repoName of repos) {
    try {
      const [repo, commits, pulls, issues] = await Promise.all([
        client.getRepo(repoName),
        client.listCommits(repoName, 5),
        client.listPullRequests(repoName, 5),
        client.listIssues(repoName, 5),
      ]);

      const candidateEvents = [
        ...(repo.description ? [buildRepositoryEvent(repoName, repo.description)] : []),
        ...commits.map((commit) => buildCommitEvent(repoName, commit)),
        ...pulls.filter((pull) => Boolean(pull.merged_at)).map((pull) => buildPullRequestEvent(repoName, pull)),
        ...issues.filter((issue) => !issue.pull_request).map((issue) => buildIssueEvent(repoName, issue)),
      ]
        .sort((left, right) => scoreGithubCandidate(right) - scoreGithubCandidate(left))
        .slice(0, 4);

      const result = await ingestGithubCandidates(user.id, candidateEvents);
      synced += result.synced;
      ideasCreated += result.ideasCreated;
    } catch (error) {
      logger.warn("GitHub ingestion failed for repo", { repoName, error });
    }
  }

  return { synced, ideasCreated, repos };
}

export async function ingestGithubWebhookEvent(
  repoName: string,
  candidates: GithubEventCandidate[],
) {
  const user = await prisma.user.findFirst();
  if (!user) {
    return { synced: 0, ideasCreated: 0, repoName, reason: "no_user" as const };
  }

  const configuredRepos = getConfiguredGithubRepos();
  if (!configuredRepos.includes(repoName)) {
    return { synced: 0, ideasCreated: 0, repoName, reason: "repo_not_configured" as const };
  }

  const result = await ingestGithubCandidates(user.id, candidates);
  return { ...result, repoName };
}

export async function ingestGithubCandidates(userId: string, candidates: GithubEventCandidate[]) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      timezone: true,
      automationEnabled: true,
      githubIdeaAutomationEnabled: true,
    },
  }) as {
    id: string;
    timezone: string;
    automationEnabled: boolean;
    githubIdeaAutomationEnabled: boolean;
  } | null;

  if (!user) {
    return { synced: 0, ideasCreated: 0, reason: "no_user" as const };
  }

  let synced = 0;
  let ideasCreated = 0;
  const dayStart = startOfTodayForTimezone(user.timezone);
  const existingIdeaCounts = await prisma.idea.groupBy({
    by: ["sourceRepoName"],
    where: {
      userId,
      source: IdeaSource.GITHUB,
      createdAt: { gte: dayStart },
    },
    _count: {
      _all: true,
    },
  });
  let ideasCreatedToday = existingIdeaCounts.reduce((sum, item) => sum + item._count._all, 0);
  const repoCounts = new Map(
    existingIdeaCounts.map((item) => [item.sourceRepoName ?? "", item._count._all]),
  );

  for (const candidate of candidates) {
    const existing = await prisma.githubEvent.findUnique({
      where: { fingerprint: candidate.fingerprint },
    });

    if (existing) {
      continue;
    }

    const savedEvent = await prisma.githubEvent.create({
      data: {
        userId,
        repoName: candidate.repoName,
        eventType: candidate.eventType,
        title: candidate.title,
        body: candidate.body,
        eventTimestamp: candidate.eventTimestamp,
        fingerprint: candidate.fingerprint,
        processed: false,
      },
    });

    synced += 1;

    if (!user.automationEnabled || !user.githubIdeaAutomationEnabled) {
      continue;
    }

    const repoIdeasToday = repoCounts.get(candidate.repoName) ?? 0;
    if (ideasCreatedToday >= env.GITHUB_MAX_IDEAS_PER_DAY) {
      continue;
    }

    if (repoIdeasToday >= env.GITHUB_MAX_IDEAS_PER_REPO_PER_DAY) {
      continue;
    }

    const summary = await summarizeGithubEvent(
      [
        `GitHub activity in ${candidate.repoName}`,
        candidate.title,
        candidate.body ?? "",
      ]
        .filter(Boolean)
        .join("\n\n"),
    );

    await prisma.idea.create({
      data: {
        userId,
        source: IdeaSource.GITHUB,
        sourceRepoName: candidate.repoName,
        rawContent: [candidate.title, candidate.body].filter(Boolean).join("\n\n"),
        normalizedContent: summary,
        status: "NEW",
      },
    });

    await prisma.githubEvent.update({
      where: { id: savedEvent.id },
      data: { processed: true },
    });

    ideasCreated += 1;
    ideasCreatedToday += 1;
    repoCounts.set(candidate.repoName, repoIdeasToday + 1);
  }

  return { synced, ideasCreated };
}

function startOfTodayForTimezone(timeZone: string) {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return new Date(`${year}-${month}-${day}T00:00:00`);
}

export function buildRepositoryEvent(repoName: string, description: string | null) {
  const title = `Repository context for ${repoName}`;
  const body = description ? `Repository description: ${description}` : "Repository description unavailable.";
  return buildEventRecord(repoName, GithubEventType.REPOSITORY, title, body, new Date());
}

export function buildCommitEvent(repoName: string, commit: GithubCommitPayload) {
  const eventTimestamp = new Date(commit.commit.author?.date ?? Date.now());
  const title = `Commit in ${repoName}: ${firstLine(commit.commit.message)}`;
  const body = `Commit message:\n${commit.commit.message}\n\nURL: ${commit.html_url}`;
  return buildEventRecord(repoName, GithubEventType.COMMIT, title, body, eventTimestamp, commit.sha);
}

export function buildPullRequestEvent(repoName: string, pull: GithubPullRequestPayload) {
  const eventTimestamp = new Date(pull.merged_at ?? pull.updated_at);
  const title = `Merged PR in ${repoName}: ${pull.title}`;
  const body = [pull.body ?? "", `PR #${pull.number}`, `URL: ${pull.html_url}`].filter(Boolean).join("\n\n");
  return buildEventRecord(repoName, GithubEventType.PULL_REQUEST, title, body, eventTimestamp, String(pull.id));
}

export function buildIssueEvent(repoName: string, issue: GithubIssuePayload) {
  const eventTimestamp = new Date(issue.updated_at);
  const title = `Issue update in ${repoName}: ${issue.title}`;
  const body = [issue.body ?? "", `Issue #${issue.number}`, `URL: ${issue.html_url}`].filter(Boolean).join("\n\n");
  return buildEventRecord(repoName, GithubEventType.ISSUE, title, body, eventTimestamp, String(issue.id));
}

export function buildReleaseEvent(
  repoName: string,
  release: {
    id: number;
    tag_name: string;
    name?: string | null;
    body?: string | null;
    html_url: string;
    published_at?: string | null;
    created_at?: string | null;
  },
) {
  const eventTimestamp = new Date(release.published_at ?? release.created_at ?? Date.now());
  const title = `Release in ${repoName}: ${release.name || release.tag_name}`;
  const body = [release.body ?? "", `Tag: ${release.tag_name}`, `URL: ${release.html_url}`].filter(Boolean).join("\n\n");
  return buildEventRecord(repoName, GithubEventType.RELEASE, title, body, eventTimestamp, String(release.id));
}

export function buildWebhookPullRequestEvent(
  repoName: string,
  pull: {
    id: number;
    number: number;
    title: string;
    body?: string | null;
    html_url: string;
    updated_at: string;
    merged_at?: string | null;
  },
  action: string,
) {
  const isMerged = Boolean(pull.merged_at);
  const title = `${isMerged ? "Merged" : capitalize(action)} PR in ${repoName}: ${pull.title}`;
  const body = [pull.body ?? "", `PR #${pull.number}`, `Action: ${action}`, `URL: ${pull.html_url}`]
    .filter(Boolean)
    .join("\n\n");
  return buildEventRecord(
    repoName,
    GithubEventType.PULL_REQUEST,
    title,
    body,
    new Date(pull.merged_at ?? pull.updated_at),
    String(pull.id),
  );
}

export function buildWebhookIssueEvent(
  repoName: string,
  issue: {
    id: number;
    number: number;
    title: string;
    body?: string | null;
    html_url: string;
    updated_at: string;
  },
  action: string,
) {
  const title = `${capitalize(action)} issue in ${repoName}: ${issue.title}`;
  const body = [issue.body ?? "", `Issue #${issue.number}`, `Action: ${action}`, `URL: ${issue.html_url}`]
    .filter(Boolean)
    .join("\n\n");
  return buildEventRecord(repoName, GithubEventType.ISSUE, title, body, new Date(issue.updated_at), String(issue.id));
}

export function buildEventRecord(
  repoName: string,
  eventType: GithubEventType,
  title: string,
  body: string | null,
  eventTimestamp: Date,
  stableId?: string,
) {
  const fingerprint = fingerprintGithubEvent(
    [repoName, eventType, stableId ?? "", title, body ?? "", eventTimestamp.toISOString()].join("::"),
  );

  return {
    repoName,
    eventType,
    title,
    body,
    eventTimestamp,
    fingerprint,
  };
}

function firstLine(value: string) {
  return value.split("\n")[0]?.trim() ?? value.trim();
}

function scoreGithubCandidate(candidate: {
  eventType: GithubEventType;
  title: string;
  body: string | null;
}) {
  const haystack = `${candidate.title} ${candidate.body ?? ""}`.toLowerCase();
  let score = 0;

  if (candidate.eventType === GithubEventType.PULL_REQUEST) score += 6;
  if (candidate.eventType === GithubEventType.COMMIT) score += 5;
  if (candidate.eventType === GithubEventType.ISSUE) score += 4;
  if (candidate.eventType === GithubEventType.REPOSITORY) score += 2;

  if (/(feature|search|filter|schema|database|launch|deploy|workflow|draft|content|github|digest)/i.test(haystack)) {
    score += 3;
  }

  if (/(fix|cleanup|docs|readme|chore|devcontainer)/i.test(haystack)) {
    score -= 1;
  }

  if (haystack.length > 120) {
    score += 1;
  }

  return score;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
