# SignalToPost Codex Master Prompt

You are an expert software engineer and product builder. Build a lean personal AI content agent for a single user.

The purpose of this tool is to help the user consistently build in public on X and LinkedIn with almost zero friction.

This is not a SaaS.
This is a private personal productivity system for one user.

The user wants to:

1. Build visibility for a fractional CFO and CFO as a service offering for early stage startups.
2. Share progress on personal software projects such as a Swiss remote jobs platform.
3. Build an audience and create more surface area for opportunities.
4. Reduce the emotional and mental friction of posting publicly.

The user is a builder, reflective, practical, and intelligent, but does not naturally enjoy self promotion. The tool should therefore act like a personal content operator that turns raw thoughts and GitHub activity into clear, concise, post ready content.

The tool must be simple, fast, reliable, and easy to maintain.
Do not over engineer.

---

## Product vision

Build a Telegram first AI agent that:

1. Receives ideas from Telegram.
2. Detects GitHub activity automatically.
3. Drafts tweets and LinkedIn posts in the user’s voice.
4. Sends drafts to Telegram for review.
5. Lets the user approve, reject, edit, or schedule posts from Telegram.
6. Posts to X and LinkedIn where possible.
7. Stores all ideas, drafts, posts, feedback, and activity in a small database.
8. Sends a morning digest in Telegram every day with draft suggestions and posting prompts.

The system should work even if direct LinkedIn posting is limited. In that case, it should still provide an easy copy and publish workflow.

---

## Core principles

1. Telegram is the main interface.
2. GitHub is an automatic idea source.
3. A web dashboard is optional and minimal.
4. The system is single user only.
5. Simple and reliable beats feature rich.
6. Get to a working version quickly.
7. All content must sound natural, direct, and useful.

---

## User context to embed into content strategy

The user is based in Zurich and is currently spending the next weeks building personal projects and repositioning professionally.

Main themes:

1. Fractional CFO for startups.
2. Startup finance systems, runway, reporting, budgeting, fundraising readiness.
3. Building tools with AI.
4. Personal projects and shipping in public.
5. Pragmatic lessons from startup operations, finance, and solo building.

The user is smart, calm, thoughtful, and practical. He tends to write too long and too neutral. The system should help him write in a clearer, sharper, more direct style.

The content should borrow best practices from successful public builders such as Pieter Levels:

1. Short and punchy.
2. Clear point of view.
3. Specific progress updates.
4. Practical lessons.
5. Occasional contrarian or strong framing.
6. Less explanation, more signal.
7. Concrete and real, not generic motivation posting.

But the writing should still feel like the user, not like a clone of someone else.

---

## Writing style system

### General voice

1. Practical.
2. Concise.
3. Thoughtful.
4. Direct.
5. Intelligent but not academic.
6. Honest, not hypey.
7. Clear opinions when useful.

### Avoid

1. Corporate buzzwords.
2. Cringe founder posting style.
3. Empty inspiration.
4. Too much self congratulation.
5. Excessive emojis.
6. Fake controversy.
7. Robotic AI phrasing.

### Prefer

1. Specific observations.
2. Real progress.
3. Lessons learned.
4. Useful frameworks.
5. Behind the scenes building notes.
6. Startup finance insights.
7. Builder perspective.

### X post style

1. Short.
2. Hook in first line.
3. Easy to scan.
4. Sometimes one strong point only.
5. Occasional mini thread if useful.
6. Written for interaction and discoverability.

### LinkedIn post style

1. More structured.
2. Still concise.
3. Useful to founders and operators.
4. Supports credibility for fractional CFO work.
5. Occasional soft call to action.

---

## Primary interfaces

### 1. Telegram bot

This is the main interface.

The user should be able to send messages like:

- "Built new search filter for my remote job board today"
- "Thinking founders often overcomplicate finance dashboards"
- "New idea: startup budgeting template powered by AI"

The bot should store these as ideas.

The bot should also send the user:

1. Generated post drafts.
2. GitHub activity based post suggestions.
3. Scheduling prompts.
4. Morning digests.
5. Simple action buttons.

Telegram actions should include:

1. Approve for X.
2. Approve for LinkedIn.
3. Approve for both.
4. Reject.
5. Rewrite shorter.
6. Rewrite sharper.
7. Rewrite more like me.
8. Schedule.
9. Edit manually.
10. Skip.

### 2. GitHub signal ingestion

This is the second core input source.

The system should connect to GitHub and ingest useful activity from selected repositories.

Useful signals include:

1. Commits.
2. Merged pull requests.
3. Created issues.
4. Released features.
5. README updates.
6. Repo descriptions.
7. Commit messages.

The system should summarize GitHub activity into human usable content ideas.

Example:

GitHub signal:
"Added multi filter job search and improved sorting logic"

Possible X draft:
"Just shipped better search and sorting for my Swiss remote jobs project.

Small feature on paper.
Huge difference in usability.

That’s often the real work."

The system should avoid noisy or overly technical drafts unless the user wants them.

---

## Morning digest

Add a daily Telegram morning digest.

Default digest contents:

1. Two suggested X drafts.
2. One optional LinkedIn draft every two to three days.
3. Top GitHub activity converted into one or two content angles.
4. A light reminder if nothing was posted or approved yesterday.
5. Suggested actions via buttons.

Example structure:

1. Good morning message.
2. Today’s top signals.
3. Draft option one.
4. Draft option two.
5. Optional LinkedIn draft.
6. Buttons for approve, rewrite, reject, schedule.

The digest should feel useful and lightweight, not nagging.

---

## System architecture

Build the system with these components:

### A. Telegram bot service

Responsibilities:

1. Receive and parse inbound messages.
2. Send daily drafts and suggestions.
3. Handle approve and reject actions.
4. Support simple editing workflows.
5. Trigger scheduling and posting actions.

### B. GitHub ingestion service

Responsibilities:

1. Poll GitHub on a schedule or receive webhooks.
2. Fetch recent activity from selected repositories.
3. Store events.
4. Summarize events into post worthy signals.
5. Avoid duplicates.

### C. AI content engine

Responsibilities:

1. Transform ideas and GitHub activity into drafts.
2. Generate X posts and LinkedIn posts.
3. Rewrite drafts based on user feedback.
4. Maintain writing style consistency.
5. Prioritize high signal and practical content.

### D. Queue and scheduler

Responsibilities:

1. Queue drafts for review.
2. Schedule approved posts.
3. Publish at requested times.
4. Retry on failure.
5. Log results.

### E. Posting adapters

Responsibilities:

1. Publish to X via API if possible.
2. Publish to LinkedIn if possible.
3. If LinkedIn direct posting is restricted, provide fallback workflow.
4. Store post IDs and statuses.

### F. Optional tiny admin UI

Only build this if it is quick.

Purpose:

1. See stored ideas.
2. Inspect queued drafts.
3. Inspect failed jobs.
4. Manually edit data if needed.

This is not the primary interface.

---

## Recommended stack

Use a lean and maintainable stack.

### Core

1. Next.js with TypeScript.
2. Node runtime.
3. Prisma ORM.
4. Postgres or SQLite for local first build.

### Telegram

1. Telegraf or grammY.

### GitHub

1. GitHub REST API or webhooks.

### AI

1. OpenAI API.

### Scheduling

1. Simple cron based jobs.
2. If deployed, use Vercel cron or a small worker.
3. If local only, use node cron.

### Deployment

1. Vercel for app and API if feasible.
2. Supabase Postgres or Neon Postgres for hosted database.
3. Alternative local first mode is acceptable if simpler.

---

## Important product decision

Default architecture should support deployment, because this tool needs to:

1. Receive Telegram messages at any time.
2. Run scheduled jobs.
3. Monitor GitHub activity.
4. Send drafts daily without manual startup.

So yes, some server or hosted backend is useful and recommended.

But keep it light:

1. One small Next.js app.
2. One database.
3. Cron jobs.
4. Telegram webhook or polling.
5. Minimal or no frontend initially.

The true product is the agent, not the dashboard.

---

## Data model

Create these core tables.

### users

Fields:

1. id
2. name
3. telegram_chat_id
4. timezone
5. created_at

### ideas

Fields:

1. id
2. user_id
3. source
4. raw_content
5. normalized_content
6. status
7. created_at
8. processed_at

source values:

1. telegram
2. github
3. manual
4. system

status values:

1. new
2. processed
3. archived

### github_events

Fields:

1. id
2. user_id
3. repo_name
4. event_type
5. title
6. body
7. event_timestamp
8. fingerprint
9. processed
10. created_at

### drafts

Fields:

1. id
2. user_id
3. platform
4. content
5. source_idea_id
6. source_github_event_id
7. status
8. quality_score
9. scheduled_for
10. created_at
11. updated_at

platform values:

1. x
2. linkedin

status values:

1. draft
2. pending_review
3. approved
4. rejected
5. scheduled
6. posted
7. failed

### post_jobs

Fields:

1. id
2. user_id
3. draft_id
4. platform
5. scheduled_for
6. status
7. external_post_id
8. failure_reason
9. created_at
10. updated_at

### feedback_events

Fields:

1. id
2. user_id
3. draft_id
4. action
5. notes
6. created_at

action values:

1. approved
2. rejected
3. rewritten_shorter
4. rewritten_sharper
5. rewritten_more_personal
6. edited
7. scheduled

This table should later help personalize style better over time.

---

## Bot commands and flows

### Basic commands

Implement these Telegram commands:

1. /start
2. /help
3. /idea
4. /drafts
5. /schedule
6. /today
7. /settings
8. /postnow

### Fast input flow

Any normal message should be treated as a possible idea unless it is clearly a command.

Example:
User sends:
"Spent all afternoon fixing bad filtering UX"

System:

1. Stores idea.
2. Replies with short acknowledgment.
3. Optionally asks whether to draft now.

### Draft review flow

Bot sends:

"Draft for X

Most job boards make filtering weirdly painful.

Spent today improving search and sorting on my Swiss remote jobs project.

Small UX details matter more than people think."

Buttons:

1. Approve X.
2. Rewrite shorter.
3. Rewrite sharper.
4. Rewrite more like me.
5. Reject.
6. Schedule.

### Scheduling flow

Allow simple natural language scheduling:

1. tomorrow 9
2. tonight 18 30
3. Monday morning

Normalize to timezone and save.

---

## Content generation logic

### Daily content rhythm

Build a default cadence:

1. Generate one or two X drafts each day.
2. Generate one LinkedIn draft every two or three days.
3. Prioritize freshest ideas and GitHub activity.
4. Do not generate repetitive content.

### Content types

The agent should generate these categories:

#### X

1. Build progress.
2. Lessons learned.
3. Short opinions.
4. Founder finance insights.
5. Startup operations observations.
6. AI coding observations.
7. Launch notes.

#### LinkedIn

1. Fractional CFO credibility posts.
2. Founder finance advice.
3. Systems and operations insights.
4. Thoughtful project updates.
5. Offer positioning posts.
6. Soft promotional posts linked to website or service.

### Selection logic

Prioritize ideas that are:

1. Recent.
2. Specific.
3. Useful to other people.
4. Connected to visible progress.
5. Aligned with current strategic goals.

Primary strategic goal:
Generate visibility and trust for the user’s fractional CFO services while also showing he is actively building and shipping.

---

## AI prompting rules

The LLM layer should use structured prompts and separate prompts for:

1. Idea normalization.
2. GitHub event summarization.
3. X draft creation.
4. LinkedIn draft creation.
5. Rewrite operations.
6. Tone calibration.

Each prompt should include:

1. User context.
2. Writing rules.
3. Examples.
4. Platform constraints.
5. Recency and specificity preference.

Also implement a small set of example posts as in code prompt fixtures so style can be tuned later.

---

## Example style directions

### Good X examples

1. "Founders wait too long to clean up their finance setup.

By the time they need a model, board reporting, or fundraising data, everything is already messy."

2. "Building simple tools for yourself is underrated.

You learn faster.
You ship faster.
And sometimes they turn into products."

3. "Just pushed a better filtering flow for my remote jobs project.

Not flashy.
But it makes the product much more usable.

That’s usually where the real value is."

### Good LinkedIn examples

1. "One thing I’ve noticed in early stage startups: many teams do not need a full time CFO, but they do need financial clarity.

That usually starts with a few basics:
cash visibility
runway tracking
budget ownership
investor ready reporting

This is exactly the type of work I’m focusing on now through fractional CFO support."

2. "Building products again has reminded me how useful finance and operations thinking can be outside traditional finance roles.

A lot of good product work is really about:
clear priorities
good systems
useful feedback loops
focused execution"

---

## Posting integrations

### X

Implement direct posting through the X API if credentials are available.

If not available:

1. Keep content ready.
2. Provide a Telegram button to copy text.
3. Optionally generate a compose link.

### LinkedIn

Attempt direct posting only if practical and stable.

If not:

1. Send final polished copy through Telegram.
2. Provide copy action.
3. Mark post as ready for manual publish.

The system must support both direct publish and manual fallback modes.

---

## Daily jobs

Implement cron jobs for:

### Morning draft generation

1. Fetch fresh ideas and GitHub events.
2. Rank content candidates.
3. Generate drafts.
4. Store drafts.
5. Send best drafts to Telegram.

### GitHub sync

1. Fetch recent activity.
2. Deduplicate using fingerprint.
3. Save useful events.
4. Optionally auto convert strong events into ideas.

### Scheduled publishing

1. Find due post jobs.
2. Publish or prepare fallback.
3. Update statuses.
4. Notify user of result.

### Cleanup

1. Archive stale drafts.
2. Deduplicate near identical drafts.
3. Mark processed items.

---

## Minimal web UI

Build only a tiny internal admin page if simple.

Pages:

1. /ideas
2. /drafts
3. /jobs
4. /settings

Purpose:

1. Inspect system state.
2. Manually fix issues.
3. Review stored content.

Do not spend much time on design.
Basic Tailwind is enough.

---

## Security and config

Use environment variables for:

1. OpenAI API key.
2. Telegram bot token.
3. Telegram chat ID allowlist.
4. GitHub token.
5. X API credentials.
6. LinkedIn credentials if used.
7. Database URL.

Restrict bot usage to the single allowed Telegram user.

---

## Development phases

Implement in this order.

### Phase 1

1. Project setup.
2. Database schema.
3. Telegram bot.
4. Idea capture from Telegram.
5. OpenAI draft generation.
6. Send drafts back to Telegram.
7. Approve and reject actions.

### Phase 2

1. GitHub integration.
2. GitHub event summarization.
3. Automatic draft generation from repo activity.
4. Daily cron jobs.
5. Morning digest.

### Phase 3

1. Scheduling flow.
2. Post queue.
3. X posting.
4. LinkedIn fallback workflow.

### Phase 4

1. Optional tiny admin UI.
2. Better rewrite controls.
3. Feedback learning loop.
4. Quality scoring and deduplication.

---

## Success criteria

The product is successful if the user can do this every day in under two minutes:

1. Send a thought to Telegram.
2. Receive a good draft.
3. Approve or tweak it.
4. Schedule or publish it.

A second success condition:
GitHub activity should regularly produce post worthy draft suggestions without user input.

---

## Implementation quality

Write clean, maintainable code.

Requirements:

1. Modular architecture.
2. Typed interfaces.
3. Clear service boundaries.
4. Simple README.
5. Good env example.
6. Seed script if useful.
7. Easy local setup.
8. No unnecessary abstractions.
9. Graceful fallback when external APIs fail.

---

## Deliverables

Build the codebase so that after setup the user can:

1. Connect Telegram.
2. Connect GitHub.
3. Store ideas.
4. Generate drafts.
5. Approve from Telegram.
6. Schedule posts.
7. Publish or manually copy posts.

Also include:

1. README with setup instructions.
2. Sample env file.
3. Database schema and migrations.
4. Prompt fixtures for content generation.
5. A clear note on what works for X and what is fallback only for LinkedIn.

---

## GitHub project structure

```text
signaltopost/
├─ README.md
├─ package.json
├─ tsconfig.json
├─ .env.example
├─ .gitignore
├─ prisma/
│  ├─ schema.prisma
│  └─ migrations/
├─ public/
├─ src/
│  ├─ app/
│  │  ├─ api/
│  │  │  ├─ telegram/
│  │  │  │  └─ route.ts
│  │  │  ├─ cron/
│  │  │  │  ├─ generate_drafts/
│  │  │  │  │  └─ route.ts
│  │  │  │  ├─ github_sync/
│  │  │  │  │  └─ route.ts
│  │  │  │  ├─ morning_digest/
│  │  │  │  │  └─ route.ts
│  │  │  │  └─ publish_posts/
│  │  │  │     └─ route.ts
│  │  │  ├─ github/
│  │  │  │  └─ webhook/
│  │  │  │     └─ route.ts
│  │  │  └─ health/
│  │  │     └─ route.ts
│  │  ├─ ideas/
│  │  │  └─ page.tsx
│  │  ├─ drafts/
│  │  │  └─ page.tsx
│  │  ├─ jobs/
│  │  │  └─ page.tsx
│  │  ├─ settings/
│  │  │  └─ page.tsx
│  │  ├─ layout.tsx
│  │  └─ page.tsx
│  ├─ lib/
│  │  ├─ db.ts
│  │  ├─ env.ts
│  │  ├─ logger.ts
│  │  └─ time.ts
│  ├─ services/
│  │  ├─ telegram/
│  │  │  ├─ bot.ts
│  │  │  ├─ commands.ts
│  │  │  ├─ handlers.ts
│  │  │  ├─ keyboards.ts
│  │  │  └─ parser.ts
│  │  ├─ github/
│  │  │  ├─ client.ts
│  │  │  ├─ ingest.ts
│  │  │  ├─ summarize.ts
│  │  │  └─ fingerprints.ts
│  │  ├─ ai/
│  │  │  ├─ client.ts
│  │  │  ├─ prompts/
│  │  │  │  ├─ shared.ts
│  │  │  │  ├─ normalize_idea.ts
│  │  │  │  ├─ summarize_github.ts
│  │  │  │  ├─ draft_x.ts
│  │  │  │  ├─ draft_linkedin.ts
│  │  │  │  └─ rewrite.ts
│  │  │  ├─ normalizeIdea.ts
│  │  │  ├─ generateDrafts.ts
│  │  │  ├─ rewriteDraft.ts
│  │  │  └─ scoreDraft.ts
│  │  ├─ posts/
│  │  │  ├─ queue.ts
│  │  │  ├─ scheduler.ts
│  │  │  ├─ publisher.ts
│  │  │  ├─ x.ts
│  │  │  ├─ linkedin.ts
│  │  │  └─ fallback.ts
│  │  └─ ideas/
│  │     ├─ create.ts
│  │     ├─ normalize.ts
│  │     └─ rank.ts
│  ├─ jobs/
│  │  ├─ generateDrafts.ts
│  │  ├─ syncGithub.ts
│  │  ├─ sendMorningDigest.ts
│  │  ├─ publishScheduled.ts
│  │  └─ cleanup.ts
│  ├─ types/
│  │  ├─ idea.ts
│  │  ├─ draft.ts
│  │  ├─ github.ts
│  │  ├─ post.ts
│  │  └─ telegram.ts
│  └─ components/
│     ├─ ui/
│     ├─ ideas/
│     ├─ drafts/
│     ├─ jobs/
│     └─ settings/
├─ scripts/
│  ├─ seed.ts
│  ├─ dev_telegram_webhook.ts
│  └─ test_github_sync.ts
└─ docs/
   ├─ architecture.md
   ├─ telegram_flows.md
   ├─ prompt_strategy.md
   └─ deployment.md
```

---

## First build instruction for Codex

When implementing, do not try to perfect everything at once.

Start by making this flow work end to end:

1. User sends idea to Telegram.
2. System stores idea.
3. System generates one X draft and one LinkedIn draft.
4. System sends drafts back to Telegram.
5. User can approve or reject.
6. Approved draft can be scheduled.
7. Scheduled draft is stored correctly.
8. Morning digest sends the best drafts automatically.

Then add GitHub ingestion.
Then add publishing.
