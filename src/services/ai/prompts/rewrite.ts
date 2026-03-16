import type { DraftPlatform } from "@prisma/client";
import { userContext } from "./shared";

type RewriteContext = {
  platform?: DraftPlatform;
  stylePreset?: string | null;
  formatPreset?: string | null;
  generationNote?: string | null;
};

export function buildRewritePrompt(input: string, direction: string, context?: RewriteContext) {
  const contextBlock = [
    context?.platform ? `Platform: ${context.platform}` : null,
    context?.stylePreset ? `Original style preset: ${context.stylePreset}` : null,
    context?.formatPreset ? `Original format preset: ${context.formatPreset}` : null,
    context?.generationNote ? `Original generation note: ${context.generationNote}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return `
${userContext}

Rewrite the following draft.
Direction: ${direction}
Avoid em dashes and avoid leaning on hyphens for style unless they are truly necessary.
${contextBlock}
Return only the rewritten draft.

Draft:
${input}
`.trim();
}
