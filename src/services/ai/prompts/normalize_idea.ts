import { userContext } from "./shared";

export function buildNormalizeIdeaPrompt(rawIdea: string) {
  return `
${userContext}

Turn the raw idea below into one clear normalized content seed for future post generation.
Keep the user's meaning intact.
Do not add fluff.
Return only the normalized sentence.

Raw idea:
${rawIdea}
`.trim();
}
