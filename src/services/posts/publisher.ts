import { DraftPlatform, DraftStatus, PostJobStatus, type Draft, type PostJob, type User } from "@prisma/client";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { sendTelegramMessage } from "@/services/telegram/bot";
import { enqueueImmediatePost } from "@/services/posts/queue";
import { publishToLinkedIn } from "@/services/posts/linkedin";
import { publishToX } from "@/services/posts/x";

type JobWithRelations = PostJob & {
  draft: Draft;
  user: User;
};

export async function publishPost(job: JobWithRelations) {
  await prisma.postJob.update({
    where: { id: job.id },
    data: { status: PostJobStatus.PROCESSING },
  });

  try {
    const result =
      job.platform === DraftPlatform.X
        ? await publishToX(job.draft)
        : await publishToLinkedIn(job.draft);

    if (result.status === "posted") {
      await prisma.$transaction([
        prisma.postJob.update({
          where: { id: job.id },
          data: {
            status: PostJobStatus.POSTED,
            externalPostId: result.externalPostId ?? null,
            failureReason: null,
          },
        }),
        prisma.draft.update({
          where: { id: job.draftId },
          data: { status: DraftStatus.POSTED },
        }),
      ]);

      await sendTelegramMessageSafely(
        job.user.telegramChatId,
        `Posted ${job.platform} draft successfully.${result.externalPostId ? ` Post ID: ${result.externalPostId}` : ""}`,
      );

      return { status: "posted" as const };
    }

    if (result.status === "manual_fallback") {
      await prisma.postJob.update({
        where: { id: job.id },
        data: {
          status: PostJobStatus.READY_FOR_MANUAL_POST,
          failureReason: result.summary,
        },
      });

      await sendTelegramMessageSafely(job.user.telegramChatId, result.summary);
      await sendTelegramMessageSafely(job.user.telegramChatId, result.postBody);
      return { status: "manual_fallback" as const };
    }

    await markJobFailed(job, result.error);
    await sendTelegramMessageSafely(
      job.user.telegramChatId,
      `Publishing failed for ${job.platform} draft.\n\n${result.error}`,
    );
    return { status: "failed" as const, error: result.error };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected publish error";

    logger.error("Unhandled exception while publishing scheduled post", {
      jobId: job.id,
      draftId: job.draftId,
      platform: job.platform,
      error,
    });

    await markJobFailed(job, message);
    await sendTelegramMessageSafely(
      job.user.telegramChatId,
      `Publishing failed for ${job.platform} draft.\n\n${message}`,
    );

    return { status: "failed" as const, error: message };
  }
}

export async function publishDraftNow(draftId: string) {
  const draft = await prisma.draft.findUnique({
    where: { id: draftId },
    include: { user: true },
  });

  if (!draft) {
    return { status: "missing" as const };
  }

  if (draft.status === "POSTED") {
    return { status: "already_posted" as const };
  }

  const job = await enqueueImmediatePost(draft);
  const jobWithRelations = await prisma.postJob.findUnique({
    where: { id: job.id },
    include: { draft: true, user: true },
  });

  if (!jobWithRelations) {
    return { status: "missing" as const };
  }

  return publishPost(jobWithRelations);
}

async function markJobFailed(job: JobWithRelations, reason: string) {
  await prisma.$transaction([
    prisma.postJob.update({
      where: { id: job.id },
      data: {
        status: PostJobStatus.FAILED,
        failureReason: reason,
      },
    }),
    prisma.draft.update({
      where: { id: job.draftId },
      data: { status: DraftStatus.FAILED },
    }),
  ]);
}

async function sendTelegramMessageSafely(chatId: string, text: string) {
  try {
    await sendTelegramMessage(chatId, text);
  } catch (error) {
    logger.error("Failed to send Telegram notification for publish job", {
      chatId,
      error,
    });
  }
}
