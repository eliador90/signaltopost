# Development

This file is a maintainer-oriented map of the codebase. For first-time setup, start with [docs/getting-started.md](docs/getting-started.md).

## Commands

```powershell
npm install
npm run dev
npm run typecheck
npm run build
```

Prisma commands:

```powershell
npx prisma generate
npx prisma migrate deploy
npx prisma studio
```

## Main Areas

- `src/app`: dashboard pages and API routes.
- `src/app/api/telegram/route.ts`: Telegram webhook route.
- `src/app/api/github/webhook/route.ts`: GitHub webhook route.
- `src/app/api/cron`: protected maintenance routes.
- `src/services/telegram`: bot commands, handlers, parser, and keyboards.
- `src/services/ai`: OpenAI client, prompts, draft generation, validation, scoring, rewrites, and presets.
- `src/services/github`: GitHub client, ingestion, webhooks, fingerprints, and summaries.
- `src/services/posts`: publishing, queueing, scheduling, X posting, and LinkedIn fallback.
- `src/lib/env.ts`: environment parsing and shared configuration helpers.
- `prisma/schema.prisma`: database schema.

## Backwards Compatibility Rules

- Keep existing environment variable names working.
- Keep saved preset IDs working.
- Avoid migrations unless a feature needs durable new state.
- Do not commit `.env`, local databases, build output, or tool folders.
- Keep the Telegram workflow usable even when optional integrations are missing.

## Prompt And Preset Work

The default content profile lives in `src/services/ai/prompts/shared.ts` and can be overridden with `CONTENT_PROFILE_*` environment variables. Presets live in `src/services/ai/presets.ts`.

Add new preset IDs rather than renaming existing IDs, because saved user defaults and drafts can reference them.

## GitHub Work

GitHub repository configuration is parsed in `src/lib/env.ts`.

`GITHUB_REPOS` supports:

- `repo-name` with `GITHUB_USERNAME` as the default owner
- `owner/repo-name` for explicit owners and organizations

Webhook ingestion stores events with whichever configured name matched the repository.

## Dashboard Work

Dashboard pages call `requireDashboardAuth()` and should never display secret values. The `/settings` checklist should show configured/missing state only.
