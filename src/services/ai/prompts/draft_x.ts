import type { ResolvedGenerationPreferences } from "@/services/ai/presets";
import { postStyleGuide, userContext } from "./shared";

export function buildXDraftPrompt(input: string, preferences?: ResolvedGenerationPreferences, tasteInstruction = "") {
  const preferenceBlock = preferences
    ? [
        `Selected style preset: ${preferences.styleLabel}`,
        preferences.styleInstruction,
        `Selected format preset: ${preferences.formatLabel}`,
        preferences.formatInstruction,
        preferences.generationNote
          ? `Custom generation note: ${preferences.generationNote}\nTreat this as an extra steering note while still respecting explicit constraints already written in the source.`
          : null,
      ]
        .filter(Boolean)
        .join("\n")
    : "";

  return `
${userContext}

${postStyleGuide("x")}

${preferenceBlock}

${tasteInstruction}

Generate three candidate X post drafts from the source below.
Hard constraints:
- Each candidate must be 280 characters or fewer.
- Do not use generic filler such as "not flashy", "small but real progress", or "this work matters".
- Do not turn routine implementation work into exaggerated lessons.
- Make the post specific, grounded, and worth publishing.
Make it specific, natural, and useful.
Respect explicit user constraints in the source, such as requested length, number of sentences, or framing.
Return only JSON that matches the requested schema.

Source:
${input}
`.trim();
}
