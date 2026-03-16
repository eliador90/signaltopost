import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
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

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  if (!isValidGithubSignature(rawBody, request.headers.get("x-hub-signature-256"))) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const eventName = request.headers.get("x-github-event");
  if (!eventName) {
    return NextResponse.json({ ok: false, error: "missing_event" }, { status: 400 });
  }

  const payload = JSON.parse(rawBody) as Record<string, any>;
  if (eventName === "ping") {
    return NextResponse.json({ ok: true, message: "pong" });
  }

  const repoName = String(payload.repository?.name ?? "");
  if (!repoName) {
    return NextResponse.json({ ok: false, error: "missing_repository" }, { status: 400 });
  }

  const candidates = buildWebhookCandidates(eventName, payload, repoName);
  if (candidates.length === 0) {
    return NextResponse.json({ ok: true, ignored: true, eventName, repoName });
  }

  const result = await ingestGithubWebhookEvent(repoName, candidates);
  return NextResponse.json({ ok: true, eventName, result });
}

function isValidGithubSignature(rawBody: string, signatureHeader: string | null) {
  if (!env.GITHUB_WEBHOOK_SECRET) {
    return true;
  }

  if (!signatureHeader?.startsWith("sha256=")) {
    return false;
  }

  const expected = `sha256=${createHmac("sha256", env.GITHUB_WEBHOOK_SECRET).update(rawBody).digest("hex")}`;
  const actualBuffer = Buffer.from(signatureHeader);
  const expectedBuffer = Buffer.from(expected);

  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(actualBuffer, expectedBuffer);
}

function buildWebhookCandidates(eventName: string, payload: Record<string, any>, repoName: string) {
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

function buildPushCandidates(payload: Record<string, any>, repoName: string): GithubEventCandidate[] {
  const commits = Array.isArray(payload.commits) ? payload.commits.slice(-3) : [];
  return commits.map((commit) =>
    buildCommitEvent(repoName, {
      sha: String(commit.id),
      commit: {
        message: String(commit.message ?? ""),
        author: {
          date: commit.timestamp ? String(commit.timestamp) : undefined,
          name: commit.author?.name ? String(commit.author.name) : undefined,
        },
      },
      html_url: String(commit.url ?? payload.compare ?? ""),
    }),
  );
}

function buildPullRequestCandidates(payload: Record<string, any>, repoName: string) {
  const action = String(payload.action ?? "");
  const relevantActions = new Set(["opened", "edited", "reopened", "closed", "synchronize"]);
  if (!relevantActions.has(action) || !payload.pull_request) {
    return [];
  }

  return [
    buildWebhookPullRequestEvent(
      repoName,
      {
        id: Number(payload.pull_request.id),
        number: Number(payload.pull_request.number),
        title: String(payload.pull_request.title ?? ""),
        body: payload.pull_request.body ? String(payload.pull_request.body) : null,
        html_url: String(payload.pull_request.html_url ?? ""),
        updated_at: String(payload.pull_request.updated_at ?? new Date().toISOString()),
        merged_at: payload.pull_request.merged_at ? String(payload.pull_request.merged_at) : null,
      },
      action,
    ),
  ];
}

function buildIssueCandidates(payload: Record<string, any>, repoName: string) {
  const action = String(payload.action ?? "");
  const relevantActions = new Set(["opened", "edited", "reopened", "closed"]);
  if (!relevantActions.has(action) || !payload.issue) {
    return [];
  }

  return [
    buildWebhookIssueEvent(
      repoName,
      {
        id: Number(payload.issue.id),
        number: Number(payload.issue.number),
        title: String(payload.issue.title ?? ""),
        body: payload.issue.body ? String(payload.issue.body) : null,
        html_url: String(payload.issue.html_url ?? ""),
        updated_at: String(payload.issue.updated_at ?? new Date().toISOString()),
      },
      action,
    ),
  ];
}

function buildReleaseCandidates(payload: Record<string, any>, repoName: string) {
  if (!payload.release) {
    return [];
  }

  return [
    buildReleaseEvent(repoName, {
      id: Number(payload.release.id),
      tag_name: String(payload.release.tag_name ?? ""),
      name: payload.release.name ? String(payload.release.name) : null,
      body: payload.release.body ? String(payload.release.body) : null,
      html_url: String(payload.release.html_url ?? ""),
      published_at: payload.release.published_at ? String(payload.release.published_at) : null,
      created_at: payload.release.created_at ? String(payload.release.created_at) : null,
    }),
  ];
}

function buildRepositoryCandidates(payload: Record<string, any>, repoName: string) {
  if (payload.action !== "edited") {
    return [];
  }

  const description = payload.repository?.description ? String(payload.repository.description) : null;
  return [buildRepositoryEvent(repoName, description)];
}
