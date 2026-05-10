# SignalToPost

SignalToPost is a self-hosted, Telegram-first AI writing and publishing cockpit. It turns raw notes and GitHub activity into reviewed X and LinkedIn drafts, then keeps approval, rewriting, scheduling, and publishing close to the chat workflow.

It is built for one operator or small team running their own credentials. This is not a hosted service: forks need their own Telegram bot, OpenAI key, database, deployment, and optional social/GitHub credentials.

![SignalToPost demo](./public/demo/signaltopost-demo.gif)

## What It Does

- Captures ideas from Telegram messages.
- Normalizes rough notes with OpenAI.
- Generates X and LinkedIn draft candidates.
- Lets you choose style and format presets before generation.
- Sends drafts back to Telegram for approve, reject, rewrite, schedule, or publish actions.
- Ingests GitHub commits, merged pull requests, issues, releases, and repository context.
- Supports on-demand GitHub activity requests from Telegram.
- Publishes directly to X when credentials are configured.
- Falls back to manual LinkedIn posting.
- Provides a private dashboard for ideas, drafts, jobs, integration status, and defaults.

## Stack

- Next.js App Router
- TypeScript
- Prisma + Postgres
- OpenAI
- Telegram Bot API
- GitHub webhooks and REST API
- X API
- Vercel + Neon

## Quick Start

```powershell
npm install
Copy-Item .env.example .env
npx prisma generate
npx prisma migrate deploy
npm run dev
```

Then configure at least:

- `DATABASE_URL`
- `DIRECT_DATABASE_URL`
- `OPENAI_API_KEY`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_ALLOWED_CHAT_ID`
- `TELEGRAM_WEBHOOK_SECRET`
- `DASHBOARD_SECRET`

Register your Telegram webhook against:

```text
https://<your-app-url>/api/telegram
```

For a fuller walkthrough, see [docs/getting-started.md](docs/getting-started.md).

## Configuration

All configuration is environment-variable based. The most important optional areas are:

- Content voice: `CONTENT_PROFILE_CONTEXT`, `CONTENT_PROFILE_THEMES`, `CONTENT_PROFILE_VOICE_RULES`, `CONTENT_PROFILE_AVOID_RULES`
- GitHub ingestion: `GITHUB_TOKEN`, `GITHUB_USERNAME`, `GITHUB_REPOS`, `GITHUB_WEBHOOK_SECRET`
- X direct posting: `X_API_KEY`, `X_API_KEY_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_TOKEN_SECRET`
- Protected routes: `DASHBOARD_SECRET`, `CRON_SECRET`

`GITHUB_REPOS` accepts either `repo-name` entries that use `GITHUB_USERNAME` as the owner, or explicit `owner/repo-name` entries for mixed personal and organization repositories.

The built-in content profile is the original Zurich founder-operator / fractional CFO voice. Leave the profile variables empty to use it, or set them to make a fork sound like you.

See [docs/configuration.md](docs/configuration.md) and [docs/customization.md](docs/customization.md).

## Deployment

The recommended path is Vercel for the app and Neon for Postgres. Deploy the Next.js app, add the same environment variables in Vercel, run Prisma migrations against the production database, and register Telegram/GitHub webhooks against the production URL.

See [docs/deployment.md](docs/deployment.md).

## Security Notes

- Never commit `.env`, database dumps, build output, or local tool folders.
- The dashboard is private and should be protected with `DASHBOARD_SECRET`.
- Cron routes require `CRON_SECRET`.
- Telegram and GitHub webhook secrets should be long random values.
- `TELEGRAM_ALLOWED_CHAT_ID` is strongly recommended for single-user safety.
- GitHub and X tokens should be scoped as narrowly as their platform allows.

See [SECURITY.md](SECURITY.md).

## Current Limitations

- SignalToPost is intentionally self-hosted and single-operator oriented.
- LinkedIn currently uses a manual publish fallback.
- GitHub webhooks must be configured per repository.
- Scheduled times are stored as queue metadata unless you run publishing manually or enable a scheduler.
- Natural-language scheduling is lightweight and works best for phrases such as `tomorrow 9`, `monday 14:30`, or `2026-05-08 09:00`.

## Roadmap Ideas

- Direct LinkedIn posting if the API path is worth the complexity.
- A richer setup wizard once the docs prove the shape.
- More built-in content profiles and preset examples.
- Stronger analytics around accepted/rejected drafts.

## Contributing

Small, practical improvements are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a PR.

## License

MIT. See [LICENSE](LICENSE).
