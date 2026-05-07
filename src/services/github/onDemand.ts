import { DraftPlatform, type User } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getConfiguredGithubRepos } from "@/lib/env";
import { formatDateTime, zonedDateTimeToUtc } from "@/lib/time";
import {
  buildCommitEvent,
  buildIssueEvent,
  buildPullRequestEvent,
  buildReleaseEvent,
  ingestGithubCandidates,
  type GithubEventCandidate,
} from "@/services/github/ingest";
import { getGithubClient } from "@/services/github/client";

export type GithubOnDemandRequest = {
  intent: "activity" | "draft";
  start: Date;
  end: Date;
  label: string;
};

export function parseGithubOnDemandRequest(text: string, timeZone: string): GithubOnDemandRequest | null {
  const normalized = text.toLowerCase().replace(/\s+/g, " ").trim();
  if (!normalized) {
    return null;
  }

  const hasGithubSignal = /\b(github|git hub|commit|commits|pull request|pull requests|pr|prs|repo|repository)\b/.test(
    normalized,
  );
  const hasActivitySignal = /\b(activity|work|progress|changes|update|updates|what did i do)\b/.test(normalized);
  const hasPostSignal = /\b(social media post|post idea|post ideas|content idea|content ideas|draft|post)\b/.test(
    normalized,
  );

  if (!hasGithubSignal && !(hasActivitySignal && hasDateSignal(normalized)) && !(hasPostSignal && hasDateSignal(normalized))) {
    return null;
  }

  const range = parseRequestedRange(normalized, timeZone);
  if (!range) {
    return null;
  }

  return {
    ...range,
    intent: hasPostSignal ? "draft" : "activity",
  };
}

export async function createGithubIdeasForRange(user: Pick<User, "id" | "timezone">, request: GithubOnDemandRequest) {
  const repos = getConfiguredGithubRepos();
  const client = getGithubClient();
  const candidates: GithubEventCandidate[] = [];

  for (const repoName of repos) {
    const [commits, pulls, issues, releases] = await Promise.all([
      client.listCommits(repoName, 100, { since: request.start, until: request.end }),
      client.listPullRequests(repoName, 100),
      client.listIssues(repoName, 100),
      client.listReleases(repoName, 20),
    ]);

    candidates.push(
      ...commits.map((commit) => buildCommitEvent(repoName, commit)),
      ...pulls.filter((pull) => Boolean(pull.merged_at)).map((pull) => buildPullRequestEvent(repoName, pull)),
      ...issues.filter((issue) => !issue.pull_request).map((issue) => buildIssueEvent(repoName, issue)),
      ...releases.map((release) => buildReleaseEvent(repoName, release)),
    );
  }

  const filteredCandidates = candidates
    .filter((candidate) => candidate.eventTimestamp >= request.start && candidate.eventTimestamp < request.end)
    .sort((left, right) => right.eventTimestamp.getTime() - left.eventTimestamp.getTime())
    .slice(0, 8);

  if (filteredCandidates.length === 0) {
    return { candidates: 0, ideasCreated: 0, ideas: [] };
  }

  const result = await ingestGithubCandidates(user.id, filteredCandidates, {
    forceIdeaCreation: true,
    enforceDailyCaps: false,
  });

  const ideas =
    result.createdIdeaIds.length > 0
      ? await prisma.idea.findMany({
          where: { id: { in: result.createdIdeaIds } },
          orderBy: { createdAt: "desc" },
          include: { user: true },
        })
      : [];

  return {
    candidates: filteredCandidates.length,
    ideasCreated: result.ideasCreated,
    ideas,
  };
}

export function getDefaultOnDemandPlatforms() {
  return [DraftPlatform.X, DraftPlatform.LINKEDIN];
}

function hasDateSignal(normalized: string) {
  return /\b(today|yesterday|last \d+ days|last week)\b/.test(normalized) || /\d{4}-\d{2}-\d{2}/.test(normalized);
}

function parseRequestedRange(normalized: string, timeZone: string) {
  const today = getLocalDateParts(new Date(), timeZone);

  const lastDaysMatch = normalized.match(/\blast\s+(\d{1,2})\s+days\b/);
  if (lastDaysMatch) {
    const days = Math.min(Math.max(Number(lastDaysMatch[1]), 1), 14);
    const startDay = addDays(today, -(days - 1));
    const endDay = addDays(today, 1);
    return {
      start: startOfLocalDay(startDay, timeZone),
      end: startOfLocalDay(endDay, timeZone),
      label: `the last ${days} days`,
    };
  }

  if (normalized.includes("last week")) {
    const startDay = addDays(today, -6);
    const endDay = addDays(today, 1);
    return {
      start: startOfLocalDay(startDay, timeZone),
      end: startOfLocalDay(endDay, timeZone),
      label: "the last 7 days",
    };
  }

  if (normalized.includes("yesterday")) {
    const day = addDays(today, -1);
    return rangeForSingleDay(day, timeZone, "yesterday");
  }

  if (normalized.includes("today")) {
    return rangeForSingleDay(today, timeZone, "today");
  }

  const isoMatch = normalized.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (isoMatch) {
    const day = {
      year: Number(isoMatch[1]),
      month: Number(isoMatch[2]),
      day: Number(isoMatch[3]),
    };
    return rangeForSingleDay(day, timeZone, formatLocalDate(day));
  }

  const euroMatch = normalized.match(/\b(\d{1,2})\.(\d{1,2})\.(\d{4})\b/);
  if (euroMatch) {
    const day = {
      year: Number(euroMatch[3]),
      month: Number(euroMatch[2]),
      day: Number(euroMatch[1]),
    };
    return rangeForSingleDay(day, timeZone, formatLocalDate(day));
  }

  return null;
}

function rangeForSingleDay(day: LocalDateParts, timeZone: string, label: string) {
  const start = startOfLocalDay(day, timeZone);
  const end = startOfLocalDay(addDays(day, 1), timeZone);
  return {
    start,
    end,
    label: `${label} (${formatDateTime(start, timeZone).split(",")[0]})`,
  };
}

type LocalDateParts = {
  year: number;
  month: number;
  day: number;
};

function getLocalDateParts(date: Date, timeZone: string): LocalDateParts {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
    day: Number(parts.find((part) => part.type === "day")?.value),
  };
}

function addDays(day: LocalDateParts, offset: number): LocalDateParts {
  const date = new Date(Date.UTC(day.year, day.month - 1, day.day));
  date.setUTCDate(date.getUTCDate() + offset);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function startOfLocalDay(day: LocalDateParts, timeZone: string) {
  return zonedDateTimeToUtc(
    {
      ...day,
      hour: 0,
      minute: 0,
    },
    timeZone,
  );
}

function formatLocalDate(day: LocalDateParts) {
  return `${day.year}-${String(day.month).padStart(2, "0")}-${String(day.day).padStart(2, "0")}`;
}
