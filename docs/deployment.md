# Deployment

SignalToPost is designed to run as an always-on hosted app.

## Current status

The current hosted setup has already been validated for:

1. Vercel production deployment
2. Neon Postgres connectivity
3. Telegram webhook delivery to production
4. GitHub Actions calling protected cron routes
5. Hosted X direct posting
6. Hosted LinkedIn manual fallback
7. GitHub webhook ingestion into production ideas
8. Dashboard actions and Telegram handoff in production

Still pending as an operational check:

1. observing a production scheduled post publish automatically at its due time without a manual trigger

Recommended stack:

1. Vercel for the Next.js app and API routes.
2. Neon Postgres for the database.
3. GitHub Actions for scheduled jobs.
4. Telegram webhook pointed at the Vercel production URL.
5. GitHub webhook pointed at the production `/api/github/webhook` route for primary repo ingestion.

## Architecture

- Vercel serves the app and all API routes.
- Telegram delivers webhook updates to `/api/telegram`.
- Neon stores users, ideas, drafts, jobs, GitHub events, and feedback.
- GitHub Actions calls protected cron routes on a schedule.
- GitHub webhooks deliver repository events to `/api/github/webhook`.
- Local scheduler remains available for development only when `ENABLE_LOCAL_SCHEDULER=true`.

## Neon setup

1. Create a new Neon project for SignalToPost.
2. Create one production database.
3. Copy:
   - pooled `DATABASE_URL`
   - direct `DIRECT_DATABASE_URL`
4. Use the same schema name, typically `public`.

Recommended pattern:

```env
DATABASE_URL=postgresql://...
DIRECT_DATABASE_URL=postgresql://...
```

## Vercel setup

1. Import the GitHub repository into Vercel.
2. Set the framework to Next.js if Vercel does not detect it automatically.
3. Add these environment variables in Vercel:
   - `APP_URL`
   - `DATABASE_URL`
   - `DIRECT_DATABASE_URL`
   - `TIMEZONE`
   - `OPENAI_API_KEY`
   - `OPENAI_MODEL`
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_ALLOWED_CHAT_ID`
   - `TELEGRAM_WEBHOOK_SECRET`
   - `GITHUB_TOKEN`
   - `GITHUB_USERNAME`
   - `GITHUB_REPOS`
   - `GITHUB_WEBHOOK_SECRET`
   - `GITHUB_MAX_IDEAS_PER_DAY`
   - `GITHUB_MAX_IDEAS_PER_REPO_PER_DAY`
   - `X_API_KEY`
   - `X_API_KEY_SECRET`
   - `X_ACCESS_TOKEN`
   - `X_ACCESS_TOKEN_SECRET`
   - `X_BEARER_TOKEN`
   - `CRON_SECRET`
   - `ENABLE_LOCAL_SCHEDULER=false`
4. Deploy the app.
5. Verify `https://<your-app>.vercel.app/api/health`.

## Database migration

The repo now uses Prisma with PostgreSQL only.

Deployment flow:

1. Point local `.env` to the Neon database.
2. Run:
```powershell
cmd /c npx prisma generate
cmd /c npx prisma migrate deploy
```
3. Once the database is initialized, Vercel can use the same production schema.
4. Any later Prisma schema changes also require `cmd /c npx prisma migrate deploy` against the production database. A Git push alone does not apply database changes.

## Telegram cutover

After Vercel is live:

1. Set:
```env
APP_URL=https://<your-app>.vercel.app
```
2. Register the production Telegram webhook:
```powershell
curl.exe "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook?url=https://<your-app>.vercel.app/api/telegram&secret_token=<TELEGRAM_WEBHOOK_SECRET>"
```
3. Verify:
```powershell
curl.exe "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo"
```
4. Stop using ngrok for normal daily use.

## GitHub webhook cutover

After Vercel is live:

1. Set:
```env
GITHUB_WEBHOOK_SECRET=<your-random-secret>
```
2. In each tracked GitHub repository, add a webhook pointing to:
```text
https://<your-app>.vercel.app/api/github/webhook
```
3. Use:
   - `Content type`: `application/json`
   - `Secret`: the same `GITHUB_WEBHOOK_SECRET`
4. Subscribe to at least:
   - push
   - pull requests
   - issues
   - releases
   - repository
5. Use the hourly `github_sync` workflow only as a manual recovery path if webhook delivery is missed.

## GitHub Actions scheduled jobs

The repo now uses one workflow per concern:

- [.github/workflows/publish-posts.yml](C:\Users\remok\projects\signaltopost\.github\workflows\publish-posts.yml)
- [.github/workflows/generate-drafts.yml](C:\Users\remok\projects\signaltopost\.github\workflows\generate-drafts.yml)
- [.github/workflows/morning-digest.yml](C:\Users\remok\projects\signaltopost\.github\workflows\morning-digest.yml)
- [.github/workflows/cleanup.yml](C:\Users\remok\projects\signaltopost\.github\workflows\cleanup.yml)
- [.github/workflows/github-sync.yml](C:\Users\remok\projects\signaltopost\.github\workflows\github-sync.yml)

Add these GitHub repository secrets:

- `SIGNALTOPOST_BASE_URL`
- `SIGNALTOPOST_CRON_SECRET`

Important:

- `SIGNALTOPOST_BASE_URL` should be the stable production URL, for example `https://signaltopost.vercel.app`
- each workflow uses `curl --location` so Vercel redirects do not silently swallow cron calls
- this split keeps the Actions UI readable because each run now has its own workflow name instead of a single generic scheduled-jobs entry

The workflow triggers:

- `/api/cron/publish_posts`
- `/api/cron/github_sync`
- `/api/cron/generate_drafts`
- `/api/cron/morning_digest`
- `/api/cron/cleanup`

GitHub Actions cron uses UTC. The comments in the workflow show the intended Zurich schedule and should be reviewed if DST alignment matters strictly.

The `github_sync` action is no longer scheduled hourly by default. It remains available for manual recovery runs while webhook ingestion is the primary path.

## GitHub automation controls

- Automatic GitHub idea generation can be disabled per user from the dashboard settings page or with `/githubideas off` in Telegram.
- When disabled, GitHub events are still ingested but new GitHub ideas are not summarized or created, which avoids additional OpenAI spend.
- Automatic GitHub idea generation is capped to keep the queue manageable:
  - total daily cap via `GITHUB_MAX_IDEAS_PER_DAY`
  - per-repo daily cap via `GITHUB_MAX_IDEAS_PER_REPO_PER_DAY`

## Rollback

If something breaks after deployment:

1. Disable or remove the Telegram webhook.
2. Pause the GitHub Actions workflow.
3. Revert Vercel environment variables if needed.
4. Point Telegram back to a local/ngrok setup only for debugging.
