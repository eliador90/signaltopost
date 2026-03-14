# Architecture

SignalToPost is built as one small Next.js app with:

1. Prisma and SQLite for local-first persistence.
2. Telegram webhook handlers under `src/app/api/telegram`.
3. AI generation services under `src/services/ai`.
4. Minimal admin inspection pages under `src/app`.
5. Cron-style routes for draft generation and morning digest.

Phase 1 is implemented around the Telegram-first draft review loop.
