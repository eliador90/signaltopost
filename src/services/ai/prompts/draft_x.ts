import { postStyleGuide, userContext } from "./shared";

export function buildXDraftPrompt(input: string) {
  return `
${userContext}

${postStyleGuide("x")}

Generate one post draft from the source below.
Keep it under 280 characters when possible.
Make it specific, natural, and useful.
Respect explicit user constraints in the source, such as requested length, number of sentences, or framing.
Return only the post body.

Source:
${input}
`.trim();
}
