# Deployment

The recommended production setup is Vercel for the Next.js app and Neon for Postgres.

## 1. Create A Database

Create a Neon project and copy:

- pooled `DATABASE_URL`
- direct `DIRECT_DATABASE_URL`

Use the `public` schema unless you have a reason to change it.

## 2. Deploy The App

1. Import the GitHub repository into Vercel.
2. Keep the framework as Next.js.
3. Add the environment variables from `.env.example`.
4. Set `APP_URL` to your production URL.
5. Deploy.
6. Verify:

```text
https://<your-app>/api/health
```

## 3. Run Migrations

From a machine with production database access:

```powershell
npx prisma generate
npx prisma migrate deploy
```

Run this again whenever new Prisma migrations are added.

## 4. Protect The Dashboard And Cron Routes

Set long random values for:

- `DASHBOARD_SECRET`
- `CRON_SECRET`

The dashboard uses HTTP Basic Auth in production. The username can be anything; the password must match `DASHBOARD_SECRET`.

## 5. Register Telegram Webhook

```powershell
curl.exe "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook?url=https://<your-app>/api/telegram&secret_token=<TELEGRAM_WEBHOOK_SECRET>"
```

Check status:

```powershell
curl.exe "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo"
```

## 6. Optional GitHub Webhooks

For each repository in `GITHUB_REPOS`, add a webhook:

```text
https://<your-app>/api/github/webhook
```

Use:

- content type `application/json`
- secret `GITHUB_WEBHOOK_SECRET`
- events: push, pull requests, issues, releases, repository

Use full `owner/repo` values in `GITHUB_REPOS` when repositories belong to multiple owners.

## 7. Optional GitHub Actions Manual Jobs

The repository includes manual workflows for protected cron routes:

- `.github/workflows/publish-posts.yml`
- `.github/workflows/generate-drafts.yml`
- `.github/workflows/morning-digest.yml`
- `.github/workflows/cleanup.yml`
- `.github/workflows/github-sync.yml`

Add these GitHub repository secrets:

- `SIGNALTOPOST_BASE_URL`
- `SIGNALTOPOST_CRON_SECRET`

The workflows are intentionally manually dispatched. Add schedules only if you want hosted automation to wake the app on a timer.

## 8. Rollback

If production misbehaves:

1. Disable Telegram webhook delivery.
2. Disable GitHub webhooks or turn off automation in `/settings`.
3. Revert the Vercel deployment or environment change.
4. Re-run migrations only if you are intentionally rolling database state forward.
