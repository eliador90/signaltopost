import { userContext } from "./shared";

export function buildGithubSummaryPrompt(input: string) {
  return `
${userContext}

Summarize the GitHub activity below into one high-signal content angle.
Keep it human and non-technical unless the change itself is the point.
Return only the summary.

GitHub activity:
${input}
`.trim();
}
