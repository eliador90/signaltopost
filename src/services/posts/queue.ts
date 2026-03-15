import type { Draft } from "@prisma/client";
import { prisma } from "@/lib/db";

export async function enqueuePost(draft: Draft, scheduledFor: Date) {
  return prisma.postJob.upsert({
    where: { draftId: draft.id },
    update: {
      scheduledFor,
      status: "PENDING",
      failureReason: null,
    },
    create: {
      userId: draft.userId,
      draftId: draft.id,
      platform: draft.platform,
      scheduledFor,
      status: "PENDING",
    },
  });
}

export async function enqueueImmediatePost(draft: Draft) {
  return enqueuePost(draft, new Date());
}
