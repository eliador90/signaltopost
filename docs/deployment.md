# Deployment

Recommended deployment path:

1. Vercel for the Next.js app and API routes.
2. Hosted Postgres later, SQLite locally for Phase 1.
3. Telegram webhook pointed at `/api/telegram`.
4. Cron routes protected with `CRON_SECRET`.

Phase 1 also works locally once dependencies are installed, Prisma is generated, and Telegram credentials are configured.
