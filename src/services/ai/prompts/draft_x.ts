import type { ResolvedGenerationPreferences } from "@/services/ai/presets";
import { postStyleGuide, userContext } from "./shared";

export function buildXDraftPrompt(input: string, preferences?: ResolvedGenerationPreferences) {
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

Generate one post draft from the source below.
Keep it under 280 characters when possible.
Make it specific, natural, and useful.
Respect explicit user constraints in the source, such as requested length, number of sentences, or framing.
Return only the post body.

Source:
${input}
`.trim();
}
