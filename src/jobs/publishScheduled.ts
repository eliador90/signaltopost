import { PostJobStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { publishPost } from "@/services/posts/publisher";

export async function runPublishScheduledJob() {
  const dueJobs = await prisma.postJob.findMany({
    where: {
      status: PostJobStatus.PENDING,
      scheduledFor: {
        lte: new Date(),
      },
    },
    include: {
      draft: true,
      user: true,
    },
    orderBy: { scheduledFor: "asc" },
    take: 20,
  });

  let posted = 0;
  let manualFallbacks = 0;
  let failed = 0;
  const errors: Array<{ jobId: string; error: string }> = [];

  for (const job of dueJobs) {
    try {
      const result = await publishPost(job);
      if (result.status === "posted") posted += 1;
      if (result.status === "manual_fallback") manualFallbacks += 1;
      if (result.status === "failed") failed += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected scheduled publish error";
      failed += 1;
      errors.push({ jobId: job.id, error: message });

      logger.error("Scheduled publish job crashed unexpectedly", {
        jobId: job.id,
        draftId: job.draftId,
        error,
      });
    }
  }

  return {
    phase: 3,
    processed: dueJobs.length,
    posted,
    manualFallbacks,
    failed,
    errors,
  };
}
