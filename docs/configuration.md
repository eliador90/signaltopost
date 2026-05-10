# Configuration

SignalToPost is configured with environment variables. Empty optional values disable their related feature.

## Core

| Variable | Required | Purpose |
| --- | --- | --- |
| `NODE_ENV` | No | `development`, `test`, or `production`. |
| `APP_URL` | Yes | Public base URL used for webhooks and dashboard links. |
| `DATABASE_URL` | Yes | Prisma pooled Postgres connection string. |
| `DIRECT_DATABASE_URL` | Recommended | Direct Postgres connection string for migrations. |
| `TIMEZONE` | No | Default timezone for newly created Telegram users. Defaults to `Europe/Zurich` for backwards compatibility. |

## OpenAI

| Variable | Required | Purpose |
| --- | --- | --- |
| `OPENAI_API_KEY` | Yes | Normalization, summaries, draft generation, rewrites, and repairs. |
| `OPENAI_MODEL` | No | Deployment default model when a user has no dashboard override. |

## Content Profile

Leave these empty to use the built-in Zurich founder-operator / fractional CFO profile.

| Variable | Required | Purpose |
| --- | --- | --- |
| `CONTENT_PROFILE_CONTEXT` | No | One-sentence audience and author context. |
| `CONTENT_PROFILE_THEMES` | No | Newline or semicolon separated themes. |
| `CONTENT_PROFILE_VOICE_RULES` | No | Newline or semicolon separated voice rules. |
| `CONTENT_PROFILE_AVOID_RULES` | No | Newline or semicolon separated avoid rules. |
| `CONTENT_PROFILE_X_GUIDANCE` | No | Extra X-specific guidance appended to the default X style guide. |
| `CONTENT_PROFILE_LINKEDIN_GUIDANCE` | No | Extra LinkedIn-specific guidance appended to the default LinkedIn style guide. |

## Telegram

| Variable | Required | Purpose |
| --- | --- | --- |
| `TELEGRAM_BOT_TOKEN` | Yes | Bot token from BotFather. |
| `TELEGRAM_ALLOWED_CHAT_ID` | Strongly recommended | Restricts usage to one chat ID. |
| `TELEGRAM_WEBHOOK_SECRET` | Recommended | Secret token checked on Telegram webhook delivery. |

## GitHub

| Variable | Required | Purpose |
| --- | --- | --- |
| `GITHUB_TOKEN` | Optional | Reads repository activity and manages existing webhooks when automation mode changes. |
| `GITHUB_USERNAME` | Optional | Default owner for `GITHUB_REPOS` entries that are only repo names. |
| `GITHUB_REPOS` | Optional | Comma-separated repositories. Entries can be `repo` or `owner/repo`. |
| `GITHUB_WEBHOOK_SECRET` | Required for webhooks | HMAC secret for `/api/github/webhook`. |
| `GITHUB_MAX_IDEAS_PER_DAY` | No | Daily cap for automatic GitHub ideas. |
| `GITHUB_MAX_IDEAS_PER_REPO_PER_DAY` | No | Per-repo daily cap for automatic GitHub ideas. |

Use a fine-grained token where possible. It needs repository read access for ingestion and webhook administration permission only if you want SignalToPost to toggle existing webhooks from the dashboard or Telegram commands.

## X

| Variable | Required | Purpose |
| --- | --- | --- |
| `X_API_KEY` | Optional | X API key for direct posting. |
| `X_API_KEY_SECRET` | Optional | X API secret for direct posting. |
| `X_ACCESS_TOKEN` | Optional | X access token for direct posting. |
| `X_ACCESS_TOKEN_SECRET` | Optional | X access token secret for direct posting. |
| `X_BEARER_TOKEN` | Optional | Available for API reads if needed. |

If X credentials are missing, draft generation and review still work.

## LinkedIn

| Variable | Required | Purpose |
| --- | --- | --- |
| `LINKEDIN_CLIENT_ID` | Optional | Reserved for direct LinkedIn integration. |
| `LINKEDIN_CLIENT_SECRET` | Optional | Reserved for direct LinkedIn integration. |
| `LINKEDIN_REDIRECT_URI` | Optional | Reserved for direct LinkedIn integration. |
| `LINKEDIN_ACCESS_TOKEN` | Optional | Reserved for direct LinkedIn integration. |

The current LinkedIn path is manual fallback: SignalToPost prepares the post and sends it for review.

## Scheduler And Protected Routes

| Variable | Required | Purpose |
| --- | --- | --- |
| `ENABLE_LOCAL_SCHEDULER` | No | Enables a local polling loop for development. Usually `false`. |
| `LOCAL_PUBLISH_POLL_SECONDS` | No | Local scheduler polling interval. |
| `CRON_SECRET` | Required for hosted cron routes | Protects `/api/cron/*` endpoints. |
| `DASHBOARD_SECRET` | Required in production | HTTP Basic Auth password for the private dashboard. |
