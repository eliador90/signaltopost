# Development

This file explains how to run SignalToPost locally and how the main services fit together.

## Local run

1. Open a terminal in [C:\Users\remok\projects\signaltopost](C:\Users\remok\projects\signaltopost).
2. Install dependencies:
```powershell
cmd /c npm install
cmd /c npx prisma generate
```
3. Create a local `.env` from [.env.example](C:\Users\remok\projects\signaltopost\.env.example).
4. Create the local database:
```powershell
cmd /c npx prisma migrate deploy
```
Fallback if Prisma migration execution fails:
```powershell
cmd /c npx prisma db push
```
5. Start the app:
```powershell
cmd /c npm run dev
```
6. For Telegram webhook testing, expose the app publicly with a tunnel such as ngrok:
```powershell
cd C:\Users\remok\projects\signaltopost\tools
.\ngrok.exe http 3000
```
7. Register the Telegram webhook against the public HTTPS URL:
```powershell
curl.exe "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook?url=<PUBLIC_URL>/api/telegram&secret_token=<TELEGRAM_WEBHOOK_SECRET>"
```

## Main services

### Telegram webhook

File: [src/app/api/telegram/route.ts](C:\Users\remok\projects\signaltopost\src\app\api\telegram\route.ts)

Purpose:
- receives Telegram webhook updates
- validates the webhook secret
- forwards the payload into the Telegram handler service

### Telegram handlers

Files:
- [src/services/telegram/handlers.ts](C:\Users\remok\projects\signaltopost\src\services\telegram\handlers.ts)
- [src/services/telegram/commands.ts](C:\Users\remok\projects\signaltopost\src\services\telegram\commands.ts)
- [src/services/telegram/keyboards.ts](C:\Users\remok\projects\signaltopost\src\services\telegram\keyboards.ts)

Purpose:
- store incoming Telegram messages as ideas
- send back generated drafts
- process approve, reject, rewrite, and schedule actions

### AI generation

Files:
- [src/services/ai/client.ts](C:\Users\remok\projects\signaltopost\src\services\ai\client.ts)
- [src/services/ai/generateDrafts.ts](C:\Users\remok\projects\signaltopost\src\services\ai\generateDrafts.ts)
- [src/services/ai/normalizeIdea.ts](C:\Users\remok\projects\signaltopost\src\services\ai\normalizeIdea.ts)
- [src/services/ai/prompts/shared.ts](C:\Users\remok\projects\signaltopost\src\services\ai\prompts\shared.ts)

Purpose:
- normalize raw ideas
- generate X and LinkedIn drafts
- rewrite drafts on demand

Behavior:
- if the OpenAI API is unavailable or quota is exhausted, the app falls back to local template-based generation instead of failing the webhook

### Persistence

Files:
- [prisma/schema.prisma](C:\Users\remok\projects\signaltopost\prisma\schema.prisma)
- [src/lib/db.ts](C:\Users\remok\projects\signaltopost\src\lib\db.ts)

Purpose:
- persist users, ideas, drafts, scheduled jobs, GitHub events, and feedback events

### Scheduling persistence

File: [src/services/posts/scheduler.ts](C:\Users\remok\projects\signaltopost\src\services\posts\scheduler.ts)

Purpose:
- store scheduled draft jobs from Telegram preset schedule buttons

Current limitation:
- schedule persistence exists, but automatic publishing is not implemented yet

### Admin pages

Files:
- [src/app/page.tsx](C:\Users\remok\projects\signaltopost\src\app\page.tsx)
- [src/app/ideas/page.tsx](C:\Users\remok\projects\signaltopost\src\app\ideas\page.tsx)
- [src/app/drafts/page.tsx](C:\Users\remok\projects\signaltopost\src\app\drafts\page.tsx)
- [src/app/jobs/page.tsx](C:\Users\remok\projects\signaltopost\src\app\jobs\page.tsx)
- [src/app/settings/page.tsx](C:\Users\remok\projects\signaltopost\src\app\settings\page.tsx)

Purpose:
- inspect the internal state without needing direct database access

## Safe workflow

1. Keep `.env` out of Git and out of screenshots.
2. Do not leave `.env` as the active IDE tab while working with Codex.
3. Rotate exposed tokens immediately if they appear in terminal output or shared context.
4. Treat `tools/` and local database files as local-only artifacts.
