# Project Setup Checklist

## Recommended folder and repo name

Use:

`signaltopost`

## What to put in the new project folder before starting Codex

Add these files to the repo root:

1. `MASTER_PROMPT_CODEX.md`
2. `CODEX_KICKOFF_PROMPT.md`
3. `PROJECT_SETUP_CHECKLIST.md`
4. `.env.example`
5. `README.md`

## Suggested first steps

1. Create a new project folder called `signaltopost`.
2. Open that folder in Codex.
3. Paste in `MASTER_PROMPT_CODEX.md`.
4. Then paste in `CODEX_KICKOFF_PROMPT.md`.
5. Let Codex scaffold the app and folder structure.
6. Review generated files and commit early.

## Services and accounts you will likely need

### Required early

1. OpenAI API key.
2. Telegram bot token from BotFather.
3. Your Telegram chat ID.
4. GitHub personal access token.

### Later

1. X API credentials.
2. LinkedIn API credentials if available.
3. Hosted database if you deploy.
4. Vercel project if you deploy.

## Suggested implementation path

### Local first

Use SQLite first for speed.
Then move to hosted Postgres once the basic flow works.

### Deploy after phase 1 or phase 2

Deploy once Telegram capture and morning digests matter enough that you want it running all the time.

## Good practical milestone definition

Version 0.1 is done when:

1. You can send an idea to Telegram.
2. The bot stores it.
3. The bot returns one X draft and one LinkedIn draft.
4. You can approve or reject the draft.
5. You can schedule it.
6. The morning digest works.

## Nice to have later

1. GitHub webhook support instead of only polling.
2. Direct X posting.
3. Direct LinkedIn posting or a cleaner fallback.
4. Tiny admin page.
5. Better style learning from your feedback.
