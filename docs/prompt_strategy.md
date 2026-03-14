# Prompt Strategy

Prompt files are split by job:

1. `normalize_idea.ts`
2. `draft_x.ts`
3. `draft_linkedin.ts`
4. `rewrite.ts`
5. `summarize_github.ts`

Each prompt includes shared user context and platform-specific constraints so the style can be tuned later without rewriting business logic.
