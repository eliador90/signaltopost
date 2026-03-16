import { userContext } from "./shared";

export function buildRewritePrompt(input: string, direction: string) {
  return `
${userContext}

Rewrite the following draft.
Direction: ${direction}
Avoid em dashes and avoid leaning on hyphens for style unless they are truly necessary.
Return only the rewritten draft.

Draft:
${input}
`.trim();
}
