import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { env, getConfiguredGithubRepoName } from "@/lib/env";
import {
  buildCommitEvent,
  buildReleaseEvent,
  buildRepositoryEvent,
  buildWebhookIssueEvent,
  buildWebhookPullRequestEvent,
  ingestGithubWebhookEvent,
  type GithubEventCandidate,
} from "@/services/github/ingest";

export const runtime = "nodejs";

type GithubWebhookPayload = Record<string, unknown>;

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  if (!isValidGithubSignature(rawBody, request.headers.get("x-hub-signature-256"))) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const eventName = request.headers.get("x-github-event");
  if (!eventName) {
    return NextResponse.json({ ok: false, error: "missing_event" }, { status: 400 });
  }

  const payload = JSON.parse(rawBody) as GithubWebhookPayload;
  if (eventName === "ping") {
    return NextResponse.json({ ok: true, message: "pong" });
  }

  const repository = objectValue(payload.repository);
  const repositoryName = stringValue(repository?.name);
  const repositoryFullName = repository?.full_name ? stringValue(repository.full_name) : null;
  const repoName = getConfiguredGithubRepoName(repositoryName, repositoryFullName);
  if (!repoName) {
    return NextResponse.json({ ok: false, error: "missing_repository" }, { status: 400 });
  }

  const candidates = buildWebhookCandidates(eventName, payload, repoName);
  if (candidates.length === 0) {
    return NextResponse.json({ ok: true, ignored: true, eventName, repoName });
  }

  const result = await ingestGithubWebhookEvent(repoName, candidates, repositoryFullName);
  return NextResponse.json({ ok: true, eventName, result });
}

function isValidGithubSignature(rawBody: string, signatureHeader: string | null) {
  const secret = env.GITHUB_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return env.NODE_ENV !== "production";
  }

  if (!signatureHeader?.startsWith("sha256=")) {
    return false;
  }

  const expected = `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`;
  const actualBuffer = Buffer.from(signatureHeader);
  const expectedBuffer = Buffer.from(expected);

  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(actualBuffer, expectedBuffer);
}

function buildWebhookCandidates(eventName: string, payload: GithubWebhookPayload, repoName: string) {
  switch (eventName) {
    case "push":
      return buildPushCandidates(payload, repoName);
    case "pull_request":
      return buildPullRequestCandidates(payload, repoName);
    case "issues":
      return buildIssueCandidates(payload, repoName);
    case "release":
      return buildReleaseCandidates(payload, repoName);
    case "repository":
      return buildRepositoryCandidates(payload, repoName);
    default:
      return [];
  }
}

function buildPushCandidates(payload: GithubWebhookPayload, repoName: string): GithubEventCandidate[] {
  const commits = Array.isArray(payload.commits) ? payload.commits.slice(-3).filter(isObjectValue) : [];
  return commits.map((commit) => {
    const author = objectValue(commit.author);
    return buildCommitEvent(repoName, {
      sha: stringValue(commit.id),
      commit: {
        message: stringValue(commit.message),
        author: {
          date: commit.timestamp ? stringValue(commit.timestamp) : undefined,
          name: author?.name ? stringValue(author.name) : undefined,
        },
      },
      html_url: stringValue(commit.url ?? payload.compare),
    });
  });
}

function buildPullRequestCandidates(payload: GithubWebhookPayload, repoName: string) {
  const action = stringValue(payload.action);
  const pullRequest = objectValue(payload.pull_request);
  const relevantActions = new Set(["opened", "edited", "reopened", "closed", "synchronize"]);
  if (!relevantActions.has(action) || !pullRequest) {
    return [];
  }

  return [
    buildWebhookPullRequestEvent(
      repoName,
      {
        id: numberValue(pullRequest.id),
        number: numberValue(pullRequest.number),
        title: stringValue(pullRequest.title),
        body: pullRequest.body ? stringValue(pullRequest.body) : null,
        html_url: stringValue(pullRequest.html_url),
        updated_at: stringValue(pullRequest.updated_at || new Date().toISOString()),
        merged_at: pullRequest.merged_at ? stringValue(pullRequest.merged_at) : null,
      },
      action,
    ),
  ];
}

function buildIssueCandidates(payload: GithubWebhookPayload, repoName: string) {
  const action = stringValue(payload.action);
  const issue = objectValue(payload.issue);
  const relevantActions = new Set(["opened", "edited", "reopened", "closed"]);
  if (!relevantActions.has(action) || !issue) {
    return [];
  }

  return [
    buildWebhookIssueEvent(
      repoName,
      {
        id: numberValue(issue.id),
        number: numberValue(issue.number),
        title: stringValue(issue.title),
        body: issue.body ? stringValue(issue.body) : null,
        html_url: stringValue(issue.html_url),
        updated_at: stringValue(issue.updated_at || new Date().toISOString()),
      },
      action,
    ),
  ];
}

function buildReleaseCandidates(payload: GithubWebhookPayload, repoName: string) {
  const release = objectValue(payload.release);
  if (!release) {
    return [];
  }

  return [
    buildReleaseEvent(repoName, {
      id: numberValue(release.id),
      tag_name: stringValue(release.tag_name),
      name: release.name ? stringValue(release.name) : null,
      body: release.body ? stringValue(release.body) : null,
      html_url: stringValue(release.html_url),
      published_at: release.published_at ? stringValue(release.published_at) : null,
      created_at: release.created_at ? stringValue(release.created_at) : null,
    }),
  ];
}

function buildRepositoryCandidates(payload: GithubWebhookPayload, repoName: string) {
  if (payload.action !== "edited") {
    return [];
  }

  const repository = objectValue(payload.repository);
  const description = repository?.description ? stringValue(repository.description) : null;
  return [buildRepositoryEvent(repoName, description)];
}

function objectValue(value: unknown): GithubWebhookPayload | null {
  return isObjectValue(value) ? value : null;
}

function isObjectValue(value: unknown): value is GithubWebhookPayload {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function stringValue(value: unknown) {
  return value == null ? "" : String(value);
}

function numberValue(value: unknown) {
  return Number(value);
}
