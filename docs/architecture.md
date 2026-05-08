# Architecture

SignalToPost is built as one small Next.js app with:

1. Prisma and Postgres for hosted and local persistence.
2. Telegram webhook handlers under `src/app/api/telegram`.
3. AI generation services under `src/services/ai`.
4. Minimal admin inspection pages under `src/app`.
5. Cron-style routes for draft generation and morning digest.

The current architecture is centered on the Telegram-first draft review loop.

## AI generation loop

Draft generation now uses a candidate pipeline instead of trusting a single completion:

1. Build platform-specific prompts with saved presets and recent feedback context.
2. Ask OpenAI for structured candidate drafts and a brief.
3. Score candidates with platform validation, anti-generic checks, and taste-memory signals.
4. Repair drafts that violate hard constraints such as X length.
5. Store only generated drafts; API failures do not silently create generic fallback posts.

Feedback events store rejection reasons and optional edited final text so future prompts can learn from what was accepted or rejected.
