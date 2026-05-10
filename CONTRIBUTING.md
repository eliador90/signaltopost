# Contributing

Thanks for improving SignalToPost. The project should stay small, practical, and self-hostable.

## Local Setup

```powershell
npm install
Copy-Item .env.example .env
npx prisma generate
npx prisma migrate deploy
npm run dev
```

Use your own API keys and local database. Do not include secrets, production URLs, database exports, or generated build artifacts in commits.

## Development Checks

Before opening a PR, run:

```powershell
npm run typecheck
npm run build
```

Run lint too if the project lint command is configured and working in your local Next.js version.

## Pull Request Expectations

- Keep changes focused.
- Preserve existing environment variable names and defaults when possible.
- Do not break saved preset IDs.
- Avoid database migrations unless the feature truly needs one.
- Document new environment variables in `.env.example` and `docs/configuration.md`.
- Document new workflow behavior in `README.md` or the relevant file under `docs/`.

## Product Direction

SignalToPost is a self-hosted Telegram-first cockpit, not a generic multi-tenant SaaS. Prefer changes that make one person's workflow clearer, safer, or easier to customize.
