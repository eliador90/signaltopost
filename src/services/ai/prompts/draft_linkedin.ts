import type { ResolvedGenerationPreferences } from "@/services/ai/presets";
import { postStyleGuide, userContext } from "./shared";

export function buildLinkedInDraftPrompt(input: string, preferences?: ResolvedGenerationPreferences, tasteInstruction = "") {
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

${postStyleGuide("linkedin")}

${preferenceBlock}

${tasteInstruction}

Generate three candidate LinkedIn post drafts from the source below.
Hard constraints:
- Keep each candidate concise, usually 320-900 characters.
- Do not use generic filler such as "not flashy", "small but real progress", or "this work matters".
- Do not turn routine implementation work into exaggerated lessons.
- Build from a concrete observation, practical implication, or operator/CFO angle.
Use short paragraphs if helpful.
Respect explicit user constraints in the source, such as requested length, number of sentences, or framing.
Return only JSON that matches the requested schema.

Source:
${input}
`.trim();
}
