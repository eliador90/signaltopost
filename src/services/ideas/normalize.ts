import { normalizeIdeaWithAI } from "@/services/ai/normalizeIdea";

export async function normalizeIdea(rawContent: string, model?: string | null) {
  return normalizeIdeaWithAI(rawContent, model);
}
