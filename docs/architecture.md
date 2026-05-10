# Architecture

SignalToPost is one small Next.js application with server-side service modules around a Prisma/Postgres database.

## Main Boundaries

- `src/app`: dashboard pages and API routes.
- `src/app/api/telegram`: Telegram webhook endpoint.
- `src/app/api/github/webhook`: GitHub webhook endpoint.
- `src/app/api/cron`: protected maintenance routes.
- `src/services/ai`: OpenAI prompts, generation, rewriting, validation, scoring, and taste signals.
- `src/services/telegram`: Telegram parsing, commands, handlers, keyboards, and message sending.
- `src/services/github`: GitHub API client, ingestion, webhooks, fingerprints, and summaries.
- `src/services/posts`: publishing, scheduling, X posting, and LinkedIn fallback.
- `src/lib`: environment, auth, database, time, logging, and scheduler helpers.

## Telegram Idea Flow

1. Telegram posts to `/api/telegram`.
2. The handler verifies the allowed chat and upserts a single user.
3. A normal message is normalized into an idea.
4. Telegram asks for platform, style preset, format preset, and optional generation note.
5. Draft generation creates candidates, scores them, repairs hard failures, and stores the selected draft.
6. Telegram sends the draft for review with approve, reject, rewrite, schedule, and publish actions.

## AI Generation Flow

1. `src/services/ai/prompts/shared.ts` builds the content profile from env or the built-in default.
2. Platform prompts add X or LinkedIn guidance.
3. User preferences add style and format preset instructions.
4. Taste-memory signals from prior feedback are added when available.
5. OpenAI returns structured candidates.
6. Local scoring and validation choose and repair the final draft.

API failures do not silently store generic fallback posts.

## GitHub Flow

GitHub can work in two modes:

- Webhooks deliver repository events to `/api/github/webhook`.
- On-demand Telegram requests fetch activity for ranges such as `today`, `yesterday`, or `last 7 days`.

The app stores GitHub events, fingerprints them to avoid duplicates, and optionally summarizes strong events into content ideas. Daily and per-repository caps protect the queue and OpenAI spend.

`GITHUB_REPOS` entries can be `repo` or `owner/repo`. Short entries use `GITHUB_USERNAME` as the owner.

## Dashboard

The dashboard is private. It provides:

- setup checklist
- ideas, drafts, and job inspection
- model and preset defaults
- automation controls
- GitHub idea automation controls
- handoff actions back to Telegram

It is an operator cockpit, not a public web app.
