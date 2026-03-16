import type { Idea } from "@prisma/client";

type RankableIdea = Pick<Idea, "rawContent" | "normalizedContent">;

export function rankIdeas<T extends RankableIdea>(ideas: T[]) {
  return [...ideas].sort((a, b) => scoreIdea(b) - scoreIdea(a));
}

function scoreIdea(idea: RankableIdea) {
  const content = (idea.normalizedContent ?? idea.rawContent).toLowerCase();
  let score = 0;

  if (content.length > 40) score += 2;
  if (content.includes("built") || content.includes("shipped")) score += 2;
  if (content.includes("founder") || content.includes("finance")) score += 2;
  if (content.includes("learned") || content.includes("lesson")) score += 1;

  return score;
}
