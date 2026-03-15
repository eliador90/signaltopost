import { generateText } from "@/services/ai/client";
import { buildGithubSummaryPrompt } from "@/services/ai/prompts/summarize_github";

export async function summarizeGithubEvent(input: string) {
  const summary = await generateText(buildGithubSummaryPrompt(input));
  return summary || fallbackGithubSummary(input);
}

function fallbackGithubSummary(input: string) {
  return input
    .replace(/\s+/g, " ")
    .replace(/^GitHub activity:\s*/i, "")
    .slice(0, 280);
}
