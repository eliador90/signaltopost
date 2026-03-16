# Deployment

SignalToPost is designed to run as an always-on hosted app.

Recommended stack:

1. Vercel for the Next.js app and API routes.
2. Neon Postgres for the database.
3. GitHub Actions for scheduled jobs.
4. Telegram webhook pointed at the Vercel production URL.

## Architecture

- Vercel serves the app and all API routes.
- Telegram delivers webhook updates to `/api/telegram`.
- Neon stores users, ideas, drafts, jobs, GitHub events, and feedback.
- GitHub Actions calls protected cron routes on a schedule.
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

## GitHub Actions scheduled jobs

The repo includes [.github/workflows/scheduled-jobs.yml](C:\Users\remok\projects\signaltopost\.github\workflows\scheduled-jobs.yml).

Add these GitHub repository secrets:

- `SIGNALTOPOST_BASE_URL`
- `SIGNALTOPOST_CRON_SECRET`

The workflow triggers:

- `/api/cron/publish_posts`
- `/api/cron/github_sync`
- `/api/cron/generate_drafts`
- `/api/cron/morning_digest`
- `/api/cron/cleanup`

GitHub Actions cron uses UTC. The comments in the workflow show the intended Zurich schedule and should be reviewed if DST alignment matters strictly.

## Rollback

If something breaks after deployment:

1. Disable or remove the Telegram webhook.
2. Pause the GitHub Actions workflow.
3. Revert Vercel environment variables if needed.
4. Point Telegram back to a local/ngrok setup only for debugging.
