# Getting Started

This guide takes a new fork from clone to a local Telegram-ready SignalToPost instance.

## 1. Clone And Install

```powershell
git clone https://github.com/<you>/signaltopost.git
Set-Location signaltopost
npm install
```

## 2. Configure Environment

```powershell
Copy-Item .env.example .env
```

Edit `.env` and set:

- `DATABASE_URL`
- `DIRECT_DATABASE_URL`
- `OPENAI_API_KEY`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_ALLOWED_CHAT_ID`
- `TELEGRAM_WEBHOOK_SECRET`
- `DASHBOARD_SECRET`

For local Postgres, use any database you control. For hosted development, Neon works well.

## 3. Initialize The Database

```powershell
npx prisma generate
npx prisma migrate deploy
```

## 4. Run The App

```powershell
npm run dev
```

Open `http://localhost:3000`. In development, the dashboard auth can be bypassed if `DASHBOARD_SECRET` is empty. In production, set it.

## 5. Connect Telegram

Create a bot with BotFather, put the token in `TELEGRAM_BOT_TOKEN`, and expose your local app with a tunnel if you want live Telegram testing.

Register the webhook:

```powershell
curl.exe "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook?url=<public-url>/api/telegram&secret_token=<TELEGRAM_WEBHOOK_SECRET>"
```

Send one message to the bot. SignalToPost creates the user record, stores the idea, and asks which platform to draft for.

## 6. Optional GitHub Ingestion

Set:

- `GITHUB_TOKEN`
- `GITHUB_REPOS`
- `GITHUB_WEBHOOK_SECRET`

`GITHUB_REPOS` can be `repo-a,repo-b` with `GITHUB_USERNAME=<owner>`, or explicit entries such as `owner/repo-a,another-org/repo-b`.

Add a webhook to each repository:

```text
<public-url>/api/github/webhook
```

Subscribe to push, pull request, issues, releases, and repository events.

## 7. Check Setup Status

Visit `/settings` in the dashboard. The setup checklist shows which integrations appear configured without revealing secret values.
