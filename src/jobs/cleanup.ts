import { DraftStatus, IdeaStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { calculateSimilarity } from "@/services/ai/dedup";

export async function runCleanupJob() {
  const staleCutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  const staleIdeas = await prisma.idea.updateMany({
    where: {
      status: IdeaStatus.NEW,
      createdAt: {
        lt: staleCutoff,
      },
    },
    data: {
      status: IdeaStatus.ARCHIVED,
      processedAt: new Date(),
    },
  });

  const candidateDrafts = await prisma.draft.findMany({
    where: {
      status: DraftStatus.PENDING_REVIEW,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const duplicateIds = new Set<string>();
  for (let index = 0; index < candidateDrafts.length; index += 1) {
    const draft = candidateDrafts[index];
    if (duplicateIds.has(draft.id)) continue;

    for (let compareIndex = index + 1; compareIndex < candidateDrafts.length; compareIndex += 1) {
      const other = candidateDrafts[compareIndex];
      if (draft.platform !== other.platform || duplicateIds.has(other.id)) {
        continue;
      }

      if (calculateSimilarity(draft.content, other.content) >= 0.82) {
        duplicateIds.add(other.id);
      }
    }
  }

  if (duplicateIds.size > 0) {
    await prisma.draft.updateMany({
      where: {
        id: {
          in: [...duplicateIds],
        },
      },
      data: {
        status: DraftStatus.REJECTED,
      },
    });
  }

  return {
    archivedIdeas: staleIdeas.count,
    rejectedDuplicates: duplicateIds.size,
  };
}
