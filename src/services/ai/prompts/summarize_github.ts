import { userContext } from "./shared";

export function buildGithubSummaryPrompt(input: string) {
  return `
${userContext}

Summarize the GitHub activity below into one high-signal content angle.
Do not simply describe the commit or PR.
Translate the work into a practical founder/operator/CFO lesson only if the lesson is genuinely supported.
Prefer concrete business or workflow implications over implementation details.
Avoid generic phrases like "small but real progress", "not flashy", "this work matters", and "clear systems".
Keep it human and non-technical unless the change itself is the point.
Return only the summary.

GitHub activity:
${input}
`.trim();
}
