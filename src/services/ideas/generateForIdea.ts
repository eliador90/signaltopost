import { prisma } from "@/lib/db";
import { isNearDuplicateDraft } from "@/services/ai/dedup";
import { buildDraftSourceFromIdea, generateDraftPair } from "@/services/ai/generateDrafts";

export async function generateDraftsForIdea(ideaId: string) {
  const idea = await prisma.idea.findUnique({
    where: { id: ideaId },
    include: { user: true },
  });

  if (!idea) {
    return { status: "missing" as const };
  }

  const existingDrafts = await prisma.draft.count({
    where: {
      sourceIdeaId: idea.id,
    },
  });

  if (existingDrafts > 0) {
    if (idea.status !== "PROCESSED") {
      await prisma.idea.update({
        where: { id: idea.id },
        data: { status: "PROCESSED", processedAt: new Date() },
      });
    }

    return { status: "already_exists" as const };
  }

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

  const drafts = await generateDraftPair(buildDraftSourceFromIdea(idea), {
    user: idea.user,
  });

  let created = 0;

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
    created += 1;
  }

  await prisma.idea.update({
    where: { id: idea.id },
    data: {
      status: "PROCESSED",
      processedAt: new Date(),
    },
  });

  return { status: "generated" as const, created };
}
