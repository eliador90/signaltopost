import { generateText } from "@/services/ai/client";
import { buildRewritePrompt } from "@/services/ai/prompts/rewrite";

export async function rewriteDraft(content: string, direction: string) {
  const rewritten = await generateText(buildRewritePrompt(content, direction));
  return rewritten || fallbackRewrite(content, direction);
}

function fallbackRewrite(content: string, direction: string) {
  if (direction === "shorter") {
    return content.length > 220 ? `${content.slice(0, 217).trim()}...` : content;
  }

  if (direction === "sharper") {
    return `${content}\n\nClearer point: practical work beats performative work.`;
  }

  if (direction === "more like me") {
    return `${content}\n\nTrying to keep the point practical and grounded.`;
  }

  return content;
}
