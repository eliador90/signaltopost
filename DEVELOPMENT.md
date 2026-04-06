# Development

This file explains how to run SignalToPost locally and how the main services fit together.

## Local run

1. Open a terminal in [C:\Users\remok\projects\signaltopost](C:\Users\remok\projects\signaltopost).
2. Install dependencies:
```powershell
cmd /c npm install
cmd /c npx prisma generate
```
3. Create a local `.env` from [.env.example](C:\Users\remok\projects\signaltopost\.env.example).
4. Point `DATABASE_URL` and `DIRECT_DATABASE_URL` at a Postgres database.
4. Create the local database:
```powershell
cmd /c npx prisma migrate deploy
```
Fallback if Prisma migration execution fails:
```powershell
cmd /c npx prisma db push
```
5. Start the app:
```powershell
cmd /c npm run dev
```
If you want scheduled drafts to publish automatically in local development, set this in `.env` first:
```env
ENABLE_LOCAL_SCHEDULER=true
LOCAL_PUBLISH_POLL_SECONDS=60
```
6. For Telegram webhook testing, expose the app publicly with a tunnel such as ngrok:
```powershell
cd C:\Users\remok\projects\signaltopost\tools
.\ngrok.exe http 3000
```
7. Register the Telegram webhook against the public HTTPS URL:
```powershell
curl.exe "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook?url=<PUBLIC_URL>/api/telegram&secret_token=<TELEGRAM_WEBHOOK_SECRET>"
```

## Main services

### Telegram webhook

File: [src/app/api/telegram/route.ts](C:\Users\remok\projects\signaltopost\src\app\api\telegram\route.ts)

Purpose:
- receives Telegram webhook updates
- validates the webhook secret
- forwards the payload into the Telegram handler service

### Telegram handlers

Files:
- [src/services/telegram/handlers.ts](C:\Users\remok\projects\signaltopost\src\services\telegram\handlers.ts)
- [src/services/telegram/commands.ts](C:\Users\remok\projects\signaltopost\src\services\telegram\commands.ts)
- [src/services/telegram/keyboards.ts](C:\Users\remok\projects\signaltopost\src\services\telegram\keyboards.ts)

Purpose:
- store incoming Telegram messages as ideas
- ask the user which platform should be drafted
- collect pre-generation style and format preset selections
- optionally capture one short custom generation note
- send back generated drafts
- process approve, reject, rewrite, immediate publish, and schedule actions
- expose `/nextidea`, `/review`, and `/githubideas on|off` commands
- expose `/automation on|off` to pause or resume background automation without turning off manual bot usage

### AI generation

Files:
- [src/services/ai/client.ts](C:\Users\remok\projects\signaltopost\src\services\ai\client.ts)
- [src/services/ai/generateDrafts.ts](C:\Users\remok\projects\signaltopost\src\services\ai\generateDrafts.ts)
- [src/services/ai/normalizeIdea.ts](C:\Users\remok\projects\signaltopost\src\services\ai\normalizeIdea.ts)
- [src/services/ai/prompts/shared.ts](C:\Users\remok\projects\signaltopost\src\services\ai\prompts\shared.ts)

Purpose:
- normalize raw ideas
- generate X and LinkedIn drafts
- rewrite drafts on demand
- respect explicit user instructions in the source text, such as requested length or sentence count
- apply selected style and format presets plus saved platform defaults before generation
- score drafts and avoid obvious low-signal or duplicate output

Behavior:
- if the OpenAI API is unavailable or quota is exhausted, the app falls back to local template-based generation instead of failing the webhook

### Persistence

Files:
- [prisma/schema.prisma](C:\Users\remok\projects\signaltopost\prisma\schema.prisma)
- [src/lib/db.ts](C:\Users\remok\projects\signaltopost\src\lib\db.ts)

Purpose:
- persist users, ideas, drafts, scheduled jobs, GitHub events, and feedback events in Postgres

### Scheduling persistence

File: [src/services/posts/scheduler.ts](C:\Users\remok\projects\signaltopost\src\services\posts\scheduler.ts)

Purpose:
- store scheduled draft jobs from Telegram preset schedule buttons

Current implementation details:
- Telegram supports quick schedule slots and natural-language phrases such as `tomorrow 9` or `in 2 hours`
- the web dashboard uses a standard datetime input for scheduling

### Publishing pipeline

Files:
- [src/jobs/publishScheduled.ts](C:\Users\remok\projects\signaltopost\src\jobs\publishScheduled.ts)
- [src/services/posts/publisher.ts](C:\Users\remok\projects\signaltopost\src\services\posts\publisher.ts)
- [src/services/posts/x.ts](C:\Users\remok\projects\signaltopost\src\services\posts\x.ts)
- [src/services/posts/linkedin.ts](C:\Users\remok\projects\signaltopost\src\services\posts\linkedin.ts)
- [src/services/posts/fallback.ts](C:\Users\remok\projects\signaltopost\src\services\posts\fallback.ts)

Purpose:
- find due scheduled jobs
- attempt direct publish for X when credentials exist
- fall back to manual Telegram delivery when direct posting is unavailable
- mark jobs as posted, manual-ready, or failed

Current implementation details:
- X uses a minimal OAuth 1.0a signed request path
- LinkedIn is manual fallback only
- Telegram receives the publish result or manual instructions
- `/postnow` and the `Post now` button create an immediate post job and run it through the same publisher pipeline
- local development can also run a lightweight in-process publish scheduler when enabled via env vars
- hosted deployments should use the protected cron routes via separate GitHub Actions workflows instead of the local scheduler

### Preset defaults

Files:
- [src/services/ai/presets.ts](C:\Users\remok\projects\signaltopost\src\services\ai\presets.ts)
- [src/app/settings/page.tsx](C:\Users\remok\projects\signaltopost\src\app\settings\page.tsx)

Purpose:
- define the code-backed style and format preset catalog
- let the user save default preset combinations for X and LinkedIn
- provide a lighter-weight control layer before generation so fewer rewrite rounds are needed

### Quality and cleanup

Files:
- [src/jobs/cleanup.ts](C:\Users\remok\projects\signaltopost\src\jobs\cleanup.ts)
- [src/services/ai/scoreDraft.ts](C:\Users\remok\projects\signaltopost\src\services\ai\scoreDraft.ts)
- [src/services/ai/dedup.ts](C:\Users\remok\projects\signaltopost\src\services\ai\dedup.ts)

Purpose:
- score drafts more realistically
- suppress near-duplicate drafts in generation and digest output
- archive stale new ideas and reject obvious duplicate pending drafts during cleanup

### GitHub ingestion

Files:
- [src/services/github/client.ts](C:\Users\remok\projects\signaltopost\src\services\github\client.ts)
- [src/services/github/ingest.ts](C:\Users\remok\projects\signaltopost\src\services\github\ingest.ts)
- [src/services/github/summarize.ts](C:\Users\remok\projects\signaltopost\src\services\github\summarize.ts)
- [src/jobs/syncGithub.ts](C:\Users\remok\projects\signaltopost\src\jobs\syncGithub.ts)

Purpose:
- fetch recent GitHub commits, merged pull requests, issues, and repo descriptions from configured repositories
- deduplicate them with stable fingerprints
- store them in `github_events`
- summarize them into GitHub-sourced ideas for later draft generation

Current implementation details:
- reads repositories from `GITHUB_REPOS`
- assumes a single owner from `GITHUB_USERNAME`
- GitHub webhooks are the primary ingestion path in hosted environments
- the `github_sync` cron/job remains available as a manual recovery path
- respects `githubIdeaAutomationEnabled` at the user level
- respects `automationEnabled` at the user level so background automation can be paused without removing Telegram access
- caps automatic GitHub idea generation using `GITHUB_MAX_IDEAS_PER_DAY` and `GITHUB_MAX_IDEAS_PER_REPO_PER_DAY`
- enforces the cap before summarization so the OpenAI usage is also reduced

### Morning digest

Files:
- [src/jobs/sendMorningDigest.ts](C:\Users\remok\projects\signaltopost\src\jobs\sendMorningDigest.ts)
- [src/app/api/cron/morning_digest/route.ts](C:\Users\remok\projects\signaltopost\src\app\api\cron\morning_digest\route.ts)

Purpose:
- generate drafts from new ideas
- send a compact morning digest into Telegram with top GitHub signals
- follow the summary with separate Telegram review cards for each recommended draft
- skip the entire flow when background automation is paused for the user

### Admin pages

Files:
- [src/app/page.tsx](C:\Users\remok\projects\signaltopost\src\app\page.tsx)
- [src/app/ideas/page.tsx](C:\Users\remok\projects\signaltopost\src\app\ideas\page.tsx)
- [src/app/drafts/page.tsx](C:\Users\remok\projects\signaltopost\src\app\drafts\page.tsx)
- [src/app/jobs/page.tsx](C:\Users\remok\projects\signaltopost\src\app\jobs\page.tsx)
- [src/app/settings/page.tsx](C:\Users\remok\projects\signaltopost\src\app\settings\page.tsx)

Purpose:
- inspect and operate the internal state without needing direct database access

Current implementation details:
- Ideas can be archived, generated into drafts, or sent back into Telegram
- Drafts page supports status filtering for `pending review`, `posted`, and `rejected`
- Draft actions are grouped into `Decision`, `Publish`, and `Telegram`
- `Mark ready` keeps the acceptance state separate from `Post now`
- `Review in Telegram` re-opens the draft inside the Telegram review loop
- Jobs can be canceled or sent back to Telegram for review
- the Ideas page supports simple filtering so processed and archived ideas can be hidden by default
- the Ideas page shows creation timestamps

## Hosted deployment

See [docs/deployment.md](C:\Users\remok\projects\signaltopost\docs\deployment.md) for the production setup on Vercel + Neon + GitHub Actions.

## Safe workflow

1. Keep `.env` out of Git and out of screenshots.
2. Do not leave `.env` as the active IDE tab while working with Codex.
3. Rotate exposed tokens immediately if they appear in terminal output or shared context.
4. Treat `tools/` and local database files as local-only artifacts.
