import { userContext } from "./shared";

export function buildRewritePrompt(input: string, direction: string) {
  return `
${userContext}

Rewrite the following draft.
Direction: ${direction}
Return only the rewritten draft.

Draft:
${input}
`.trim();
}
