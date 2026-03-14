# SignalToPost

SignalToPost is a private Telegram-first AI content agent for one user. It captures ideas from Telegram, turns them into X and LinkedIn drafts, and lets the user review them quickly.

## Phase 1 scope

Current implementation covers:

1. Next.js project scaffold with App Router.
2. Prisma schema for ideas, drafts, feedback, jobs, users, and GitHub events.
3. Telegram webhook endpoint.
4. Automatic idea capture from Telegram messages.
5. OpenAI-powered normalization and draft generation with local fallbacks.
6. Telegram inline actions for approve, reject, and rewrite.
7. Simple scheduling data flow with queued post jobs and preset Telegram slots.
8. Minimal admin pages for ideas, drafts, jobs, and settings.
9. Morning digest and draft-generation cron endpoints.

GitHub ingestion and posting adapters are stubbed for later phases.

## Local setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env`.
3. Run `npx prisma generate`.
4. Run `npx prisma migrate dev --name init`.
5. Start the app with `npm run dev`.
6. Configure your Telegram bot webhook to point to `/api/telegram`.

## Telegram flow

1. Send a normal message to the bot.
2. SignalToPost stores the idea.
3. It generates one X draft and one LinkedIn draft.
4. It sends both drafts back with inline review buttons.
5. Approve, reject, request rewrites, or queue a draft for tomorrow.

## Progress note

Done in Phase 1:

1. Telegram idea capture.
2. OpenAI draft generation with fallback output.
3. Telegram review actions.
4. Simple scheduling persistence.
5. Minimal admin inspection UI.

Next up:

1. End-to-end testing with real Telegram credentials.
2. GitHub activity ingestion in Phase 2.
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

## Current limitations

1. Scheduling currently uses preset Telegram slots instead of full natural-language parsing.
2. Direct posting to X and LinkedIn is not implemented yet.
3. GitHub ingestion starts in Phase 2.
