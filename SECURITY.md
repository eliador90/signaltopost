# Security

SignalToPost is self-hosted software. Each deployment owner is responsible for keeping credentials, database access, webhooks, and dashboard access private.

## Secrets

Never commit:

- `.env` or `.env.local`
- database dumps
- Vercel, Neon, Telegram, OpenAI, GitHub, X, or LinkedIn tokens
- local build output
- local tool folders

The `.gitignore` excludes common local artifacts such as `.env`, `.next`, `node_modules`, `dev.db`, `.codex`, `tools`, and `tsconfig.tsbuildinfo`.

## Dashboard

The dashboard is private and should be protected in production with `DASHBOARD_SECRET`. It uses HTTP Basic Auth; any username is accepted, and the password must match the secret.

## Telegram Webhook

Set:

- `TELEGRAM_WEBHOOK_SECRET`
- `TELEGRAM_ALLOWED_CHAT_ID`

The allowed chat ID is strongly recommended so random bot users cannot create ideas or drafts.

## GitHub Webhook

Set `GITHUB_WEBHOOK_SECRET` when using GitHub webhooks. Deliveries are verified with `X-Hub-Signature-256`.

Use the narrowest GitHub token that supports your needs:

- repository read access for ingestion
- webhook administration only if you want dashboard or Telegram controls to toggle existing webhooks

## Cron Routes

Set `CRON_SECRET` for hosted cron routes. Do not expose secret-bearing cron URLs publicly.

## Responsible Disclosure

If you find a security issue, please open a private disclosure path with the repository owner rather than filing a public issue with exploit details.
