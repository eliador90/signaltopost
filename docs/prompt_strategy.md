# Prompt Strategy

Prompt files are split by job:

1. `normalize_idea.ts`
2. `draft_x.ts`
3. `draft_linkedin.ts`
4. `rewrite.ts`
5. `summarize_github.ts`

Each prompt includes shared user context and platform-specific constraints so the style can be tuned later without rewriting business logic.

Current draft generation strategy:

1. Generate a structured brief and up to three candidates.
2. Validate hard platform constraints before storing.
3. Score candidates with a rubric that penalizes generic repeated phrasing and over-length posts.
4. Include recent approved and rejected examples when available.
5. Store rejection reasons and edited final text as taste-memory signals.

The system intentionally fails draft creation when OpenAI draft generation is unavailable. Normalization and GitHub summaries can still use lightweight fallbacks, but publishable social posts should not be created from generic templates.
