import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { DraftGenerationError } from "@/services/ai/errors";
import { isNearDuplicateDraft } from "@/services/ai/dedup";
import { buildDraftSourceFromIdea, generateDraftPair } from "@/services/ai/generateDrafts";
import { rankIdeas } from "@/services/ideas/rank";

export async function runGenerateDraftsJob() {
  const ideas = await prisma.idea.findMany({
    where: {
      status: "NEW",
      user: {
        automationEnabled: true,
      },
    } as never,
    include: { user: true },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const ranked = rankIdeas(ideas) as typeof ideas;

  for (const idea of ranked) {
    const recentDrafts = await prisma.draft.findMany({
      where: {
        userId: idea.userId,
        platform: { in: ["X", "LINKEDIN"] },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        content: true,
        platform: true,
      },
    });

    const existingDrafts = await prisma.draft.count({
      where: {
        sourceIdeaId: idea.id,
      },
    });

    if (existingDrafts > 0) {
      await prisma.idea.update({
        where: { id: idea.id },
        data: { status: "PROCESSED", processedAt: new Date() },
      });
      continue;
    }

    let drafts: Awaited<ReturnType<typeof generateDraftPair>>;
    try {
      drafts = await generateDraftPair(buildDraftSourceFromIdea(idea), {
        user: idea.user,
      });
    } catch (error) {
      if (error instanceof DraftGenerationError) {
        logger.warn("Skipped idea because draft generation failed", {
          ideaId: idea.id,
          error: error.message,
        });
        continue;
      }

      throw error;
    }
    for (const draft of drafts) {
      const platformDrafts = recentDrafts.filter((existing) => existing.platform === draft.platform);
      if (isNearDuplicateDraft(draft.content, platformDrafts)) {
        continue;
      }

      await prisma.draft.create({
        data: {
          userId: idea.userId,
          platform: draft.platform,
          content: draft.content,
          stylePreset: draft.stylePreset,
          formatPreset: draft.formatPreset,
          generationNote: draft.generationNote,
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
