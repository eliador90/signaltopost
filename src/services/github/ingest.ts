import { GithubEventType, IdeaSource } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getConfiguredGithubRepos } from "@/lib/env";
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

      for (const candidate of candidateEvents) {
        const existing = await prisma.githubEvent.findUnique({
          where: { fingerprint: candidate.fingerprint },
        });

        if (existing) {
          continue;
        }

        const savedEvent = await prisma.githubEvent.create({
          data: {
            userId: user.id,
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
            userId: user.id,
            source: IdeaSource.GITHUB,
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
      }
    } catch (error) {
      logger.warn("GitHub ingestion failed for repo", { repoName, error });
    }
  }

  return { synced, ideasCreated, repos };
}

function buildRepositoryEvent(repoName: string, description: string | null) {
  const title = `Repository context for ${repoName}`;
  const body = description ? `Repository description: ${description}` : "Repository description unavailable.";
  return buildEventRecord(repoName, GithubEventType.REPOSITORY, title, body, new Date());
}

function buildCommitEvent(repoName: string, commit: GithubCommitPayload) {
  const eventTimestamp = new Date(commit.commit.author?.date ?? Date.now());
  const title = `Commit in ${repoName}: ${firstLine(commit.commit.message)}`;
  const body = `Commit message:\n${commit.commit.message}\n\nURL: ${commit.html_url}`;
  return buildEventRecord(repoName, GithubEventType.COMMIT, title, body, eventTimestamp, commit.sha);
}

function buildPullRequestEvent(repoName: string, pull: GithubPullRequestPayload) {
  const eventTimestamp = new Date(pull.merged_at ?? pull.updated_at);
  const title = `Merged PR in ${repoName}: ${pull.title}`;
  const body = [pull.body ?? "", `PR #${pull.number}`, `URL: ${pull.html_url}`].filter(Boolean).join("\n\n");
  return buildEventRecord(repoName, GithubEventType.PULL_REQUEST, title, body, eventTimestamp, String(pull.id));
}

function buildIssueEvent(repoName: string, issue: GithubIssuePayload) {
  const eventTimestamp = new Date(issue.updated_at);
  const title = `Issue update in ${repoName}: ${issue.title}`;
  const body = [issue.body ?? "", `Issue #${issue.number}`, `URL: ${issue.html_url}`].filter(Boolean).join("\n\n");
  return buildEventRecord(repoName, GithubEventType.ISSUE, title, body, eventTimestamp, String(issue.id));
}

function buildEventRecord(
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
