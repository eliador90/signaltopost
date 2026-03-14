import { postStyleGuide, userContext } from "./shared";

export function buildLinkedInDraftPrompt(input: string) {
  return `
${userContext}

${postStyleGuide("linkedin")}

Generate one LinkedIn post draft from the source below.
Keep it concise.
Use short paragraphs if helpful.
Return only the post body.

Source:
${input}
`.trim();
}
