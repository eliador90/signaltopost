import { generateText } from "@/services/ai/client";
import { buildNormalizeIdeaPrompt } from "@/services/ai/prompts/normalize_idea";

export async function normalizeIdeaWithAI(rawIdea: string, model?: string | null) {
  const generated = await generateText(buildNormalizeIdeaPrompt(rawIdea), model);
  return generated || rawIdea.trim().replace(/\s+/g, " ");
}
