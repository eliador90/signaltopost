# SignalToPost

SignalToPost is a private Telegram-first AI content agent for one user. It captures ideas from Telegram, turns them into X and LinkedIn drafts, and lets the user review them quickly.

## Status

Current project status:

1. Production deployment is live on Vercel with Neon Postgres.
2. Telegram webhook is running against the hosted app.
3. GitHub Actions can trigger the protected cron routes.
4. Hosted X direct posting is validated.
5. Hosted LinkedIn manual fallback is validated.
6. GitHub webhook ingestion is validated in production.
7. Dashboard actions and Telegram handoff are live in production.
8. One remaining operational confirmation is to observe a production scheduled post being picked up automatically at its due time without a manual run.

## Current scope

Current implementation covers:

1. Next.js project scaffold with App Router.
2. Prisma schema for ideas, drafts, feedback, jobs, users, and GitHub events.
3. Telegram webhook endpoint.
4. Automatic idea capture from Telegram messages.
5. OpenAI-powered normalization and draft generation with local fallbacks.
6. Telegram inline actions for approve, reject, and rewrite.
7. Scheduling data flow with queued post jobs, quick slots, and natural-language Telegram scheduling input.
8. Actionable dashboard pages for ideas, drafts, jobs, and settings.
9. GitHub sync that ingests recent commits, merged pull requests, issues, and repo context from configured repositories.
10. GitHub webhook ingestion for push, pull request, issue, release, and repository edit events.
11. GitHub-to-idea summarization so repository activity can become draft candidates automatically.
12. Daily GitHub idea caps with per-repo throttling to keep volume manageable and reduce API spend.
13. Morning digest that sends a short summary plus separate Telegram review cards for each recommended draft.
14. GitHub idea automation toggle in Telegram and on the dashboard.
15. Morning digest and draft-generation cron endpoints.
16. Scheduled publish processing with X direct-post support when credentials are configured.
17. LinkedIn manual publish fallback delivered through Telegram.
18. Immediate publish from Telegram via the `Post now` button or `/postnow`.
19. Pre-generation style and format presets with saved per-platform defaults.
20. Better rewrite controls, draft quality scoring, duplicate suppression, and lightweight feedback signals.
21. Hosted deployment path for Vercel + Neon + GitHub Actions cron jobs.
22. Web dashboard actions for triage, publishing, scheduling, canceling jobs, and sending items back into Telegram.

## Local setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env`.
3. Point `DATABASE_URL` and `DIRECT_DATABASE_URL` at Postgres.
4. Run `npx prisma generate`.
5. Run `npx prisma migrate deploy`.
6. Start the app with `npm run dev`.
7. Configure your Telegram bot webhook to point to `/api/telegram`.

## Telegram flow

1. Send a normal message to the bot.
2. SignalToPost stores the idea and asks which platform you want a draft for.
3. Choose `X`, `LinkedIn`, or `Both`.
4. Choose a style preset and a format preset, then optionally add one short note.
5. It generates only the selected platform drafts.
6. It sends the drafts back with inline review buttons and clearer sectioned formatting.
7. Use `/nextidea` to pull the next GitHub idea into Telegram.
8. Use `/review` to cycle through the open `PENDING_REVIEW` drafts.
9. Use `/githubideas`, `/githubideas on`, or `/githubideas off` to inspect or control automatic GitHub idea generation.
10. Approve, reject, use richer rewrite controls, publish immediately, or schedule a draft with quick slots or a free-form time phrase like `tomorrow 9` or `in 2 hours`.
11. Use the web dashboard to generate drafts, archive ideas, send ideas or drafts back into Telegram, schedule drafts, post now, or cancel pending jobs.

## GitHub flow

1. Configure `GITHUB_TOKEN`, `GITHUB_USERNAME`, `GITHUB_REPOS`, and `GITHUB_WEBHOOK_SECRET` in `.env`.
2. Register a GitHub webhook against `/api/github/webhook` for push, pull request, issues, release, and repository events.
3. Webhook deliveries are verified with `X-Hub-Signature-256`.
4. Recent repo activity is stored in `github_events`.
5. If GitHub idea automation is enabled, strong events are summarized into `ideas` with source `GITHUB`.
6. Automatic GitHub idea generation is capped to avoid backlog overload:
   - total daily cap via `GITHUB_MAX_IDEAS_PER_DAY`
   - per-repo daily cap via `GITHUB_MAX_IDEAS_PER_REPO_PER_DAY`
7. Draft generation can turn those ideas into pending review drafts.
8. The hourly `github_sync` cron remains available as a manual recovery path, not the primary ingestion path.

Important reminder:

- Every new GitHub repository you want included in SignalToPost idea generation must be added to `GITHUB_REPOS` and must also get its own webhook pointing to `/api/github/webhook`.

## Progress note

Done so far:

1. Telegram-first idea capture, preset-based draft generation, and review loop.
2. Natural-language scheduling in Telegram plus web datetime scheduling.
3. Hosted X posting and LinkedIn manual fallback.
4. GitHub webhook ingestion with polling-style cron retained as manual recovery.
5. Actionable dashboard controls for ideas, drafts, jobs, and GitHub automation.
6. Telegram commands for review queue access and GitHub idea automation control.
7. Hosted deployment on Vercel + Neon + GitHub Actions.

Next up:

1. Harden direct X posting against more API edge cases.
2. Improve morning digest formatting and button flows further.
3. Consider optional direct LinkedIn posting if a stable path is worth the complexity.
4. Add stronger post-generation validation for exact constraints like sentence count when needed.
5. Tighten hosted deployment observability and seasonal cron timing for Zurich.

## Important env vars

Core:

- `DATABASE_URL`
- `DIRECT_DATABASE_URL`
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
- `GITHUB_WEBHOOK_SECRET`
- `GITHUB_MAX_IDEAS_PER_DAY`
- `GITHUB_MAX_IDEAS_PER_REPO_PER_DAY`

## Current limitations

1. Natural-language scheduling is intentionally lightweight and works best for phrases like `tomorrow 9`, `monday 14:30`, `in 2 hours`, or explicit dates.
2. X direct posting depends on valid X API credentials and credits.
3. LinkedIn currently uses manual publish fallback rather than direct posting.
4. GitHub webhook delivery must be configured explicitly in GitHub; the hourly `github_sync` action remains only as a manual fallback.
5. If GitHub idea automation is disabled, incoming GitHub events are stored but do not get summarized into ideas until future events arrive after re-enabling.
6. GitHub Actions schedules use UTC and may need seasonal review for exact Zurich morning timing.
7. Production cron automation now uses separate GitHub Actions workflows per concern so the Actions UI stays readable and each run maps to one responsibility.
7. The dashboard is operational for control and handoff, but Telegram remains the primary place for refinement and approval.
