import { prisma } from "@/lib/db";
import { generateDraftPair } from "@/services/ai/generateDrafts";
import { rankIdeas } from "@/services/ideas/rank";

export async function runGenerateDraftsJob() {
  const ideas = await prisma.idea.findMany({
    where: { status: "NEW" },
    include: { user: true },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const ranked = rankIdeas(ideas);

  for (const idea of ranked) {
    const drafts = await generateDraftPair(idea.normalizedContent ?? idea.rawContent);
    for (const draft of drafts) {
      await prisma.draft.create({
        data: {
          userId: idea.userId,
          platform: draft.platform,
          content: draft.content,
          sourceIdeaId: idea.id,
          status: "PENDING_REVIEW",
          qualityScore: draft.qualityScore,
        },
      });
    }

    await prisma.idea.update({
      where: { id: idea.id },
      data: { status: "PROCESSED", processedAt: new Date() },
    });
  }

  return { processedIdeas: ranked.length };
}
