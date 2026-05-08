import type { DraftPlatform } from "@prisma/client";
import { userContext } from "./shared";

export function buildRepairDraftPrompt(input: string, platform: DraftPlatform, issues: string[]) {
  const platformRules =
    platform === "X"
      ? "Keep the rewrite at 280 characters or fewer. Preserve one sharp point."
      : "Keep the rewrite concise, specific, and easy to scan. Preserve the useful business or operator implication.";

  return `
${userContext}

Repair the draft below.
Issues to fix: ${issues.join(", ")}
${platformRules}
Avoid generic filler, repeated SignalToPost phrases, hype, and em dashes.
Return only the repaired post body.

Draft:
${input}
`.trim();
}
