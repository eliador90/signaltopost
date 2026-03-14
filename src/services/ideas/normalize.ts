import { normalizeIdeaWithAI } from "@/services/ai/normalizeIdea";

export async function normalizeIdea(rawContent: string) {
  return normalizeIdeaWithAI(rawContent);
}
