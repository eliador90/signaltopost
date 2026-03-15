# SignalToPost

SignalToPost is a private Telegram-first AI content agent for one user. It captures ideas from Telegram, turns them into X and LinkedIn drafts, and lets the user review them quickly.

## Current scope

Current implementation covers:

1. Next.js project scaffold with App Router.
2. Prisma schema for ideas, drafts, feedback, jobs, users, and GitHub events.
3. Telegram webhook endpoint.
4. Automatic idea capture from Telegram messages.
5. OpenAI-powered normalization and draft generation with local fallbacks.
6. Telegram inline actions for approve, reject, and rewrite.
7. Simple scheduling data flow with queued post jobs and preset Telegram slots.
8. Minimal admin pages for ideas, drafts, jobs, and settings.
9. GitHub sync that ingests recent commits, merged pull requests, issues, and repo context from configured repositories.
10. GitHub-to-idea summarization so repository activity can become draft candidates automatically.
11. Morning digest and draft-generation cron endpoints.

## Local setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env`.
3. Run `npx prisma generate`.
4. Run `npx prisma migrate dev --name init`.
5. Start the app with `npm run dev`.
6. Configure your Telegram bot webhook to point to `/api/telegram`.

## Telegram flow

1. Send a normal message to the bot.
2. SignalToPost stores the idea and asks which platform you want a draft for.
3. Choose `X`, `LinkedIn`, or `Both`.
4. It generates only the selected platform drafts.
5. It sends the drafts back with inline review buttons.
6. Approve, reject, request rewrites, or queue a draft for tomorrow.

## GitHub flow

1. Configure `GITHUB_TOKEN`, `GITHUB_USERNAME`, and `GITHUB_REPOS` in `.env`.
2. Trigger the sync route or run the GitHub sync job.
3. Recent repo activity is stored in `github_events`.
4. Strong events are summarized into `ideas` with source `GITHUB`.
5. Draft generation can turn those ideas into pending review drafts.

## Progress note

Done in Phase 1:

1. Telegram idea capture.
2. OpenAI draft generation with fallback output.
3. Telegram review actions.
4. Simple scheduling persistence.
5. Minimal admin inspection UI.

Next up:

1. Refine GitHub signal ranking and event selection.
2. Improve morning digest formatting and button flows.
3. Better natural-language scheduling.
4. Actual publishing adapters in Phase 3.

## Important env vars

Core:

- `DATABASE_URL`
- `APP_URL`
- `TIMEZONE`

Telegram:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_ALLOWED_CHAT_ID`
- `TELEGRAM_WEBHOOK_SECRET`

OpenAI:

- `OPENAI_API_KEY`
- `OPENAI_MODEL`

GitHub:

- `GITHUB_TOKEN`
- `GITHUB_USERNAME`
- `GITHUB_REPOS`

## Current limitations

1. Scheduling currently uses preset Telegram slots instead of full natural-language parsing.
2. Direct posting to X and LinkedIn is not implemented yet.
3. GitHub webhook ingestion is still stubbed; the current implementation uses scheduled polling-style sync.
