# Codex Kickoff Prompt

Use this as the very first prompt inside Codex once the repository folder exists.

## Prompt

You are helping me build a private single user content agent called SignalToPost.

Please read the file `MASTER_PROMPT_CODEX.md` in the repo root and treat it as the source of truth.

Your task now is to start implementation independently and pragmatically.

Follow these rules:

1. Do not over engineer.
2. Build the smallest working vertical slice first.
3. Prefer simple maintainable patterns over clever abstractions.
4. Keep code clean, typed, and well structured.
5. Add concise comments only where they are useful.
6. Create files directly rather than discussing too much.
7. When a choice is ambiguous, choose the option that keeps the product lean and easy to ship.
8. Use Telegram as the primary interface.
9. Treat the web UI as secondary and minimal.
10. Add graceful fallbacks where external APIs may be difficult, especially LinkedIn posting.

## Implementation order

Phase 1 only for now:

1. Initialize a Next.js TypeScript app if not already initialized.
2. Add Prisma and define the initial schema.
3. Add environment variable validation.
4. Implement Telegram webhook endpoint and basic bot handling.
5. Store incoming Telegram messages as ideas.
6. Add OpenAI based draft generation.
7. Return one X draft and one LinkedIn draft to Telegram.
8. Add approve and reject actions.
9. Add simple scheduling data flow without actual publishing yet.
10. Add a minimal README and `.env.example`.

## Important output expectations

As you work:

1. Create the project structure described in `MASTER_PROMPT_CODEX.md`.
2. Keep a short running TODO in the README or a dedicated progress note.
3. If some third party posting flow cannot be completed yet, stub it cleanly and document it.
4. Make the app runnable locally.
5. Prioritize a working end to end demo flow over full completeness.

## What I want from you right away

Please begin by:

1. Scaffolding the repo structure.
2. Creating the Prisma schema.
3. Creating the env file template.
4. Creating the Telegram webhook route.
5. Creating the OpenAI draft generation service.
6. Updating the README with setup steps.

Then summarize what you implemented and what remains for the next phase.
