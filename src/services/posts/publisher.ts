import { DraftPlatform, PostJobStatus, type Draft, type PostJob, type User } from "@prisma/client";
import { prisma } from "@/lib/db";
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
        data: { status: "POSTED" },
      }),
    ]);

    await sendTelegramMessage(
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

    await sendTelegramMessage(job.user.telegramChatId, result.summary);
    await sendTelegramMessage(job.user.telegramChatId, result.postBody);
    return { status: "manual_fallback" as const };
  }

  await prisma.$transaction([
    prisma.postJob.update({
      where: { id: job.id },
      data: {
        status: PostJobStatus.FAILED,
        failureReason: result.error,
      },
    }),
    prisma.draft.update({
      where: { id: job.draftId },
      data: { status: "FAILED" },
    }),
  ]);

  await sendTelegramMessage(job.user.telegramChatId, `Publishing failed for ${job.platform} draft.\n\n${result.error}`);
  return { status: "failed" as const, error: result.error };
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
