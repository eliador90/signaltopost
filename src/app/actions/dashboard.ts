"use server";

import { FeedbackAction, PostJobStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { parseDateTimeLocalInput } from "@/lib/time";
import { generateDraftsForIdea } from "@/services/ideas/generateForIdea";
import { publishDraftNow } from "@/services/posts/publisher";
import { schedulePostForDateTime } from "@/services/posts/scheduler";
import { sendTelegramMessage } from "@/services/telegram/bot";
import { sendDraftForReview } from "@/services/telegram/handlers";
import { ideaPlatformKeyboard } from "@/services/telegram/keyboards";

export async function archiveIdeaAction(formData: FormData) {
  const ideaId = String(formData.get("ideaId") ?? "");
  const redirectPath = String(formData.get("redirectPath") ?? "/ideas");

  if (!ideaId) {
    return redirectWithMessage(redirectPath, "Missing idea.", "error");
  }

  await prisma.idea.update({
    where: { id: ideaId },
    data: {
      status: "ARCHIVED",
    },
  });

  revalidateDashboardPaths();
  redirectWithMessage(redirectPath, "Idea archived.", "success");
}

export async function generateDraftsForIdeaAction(formData: FormData) {
  const ideaId = String(formData.get("ideaId") ?? "");
  const redirectPath = String(formData.get("redirectPath") ?? "/ideas");

  if (!ideaId) {
    return redirectWithMessage(redirectPath, "Missing idea.", "error");
  }

  const result = await generateDraftsForIdea(ideaId);
  if (result.status === "missing") {
    return redirectWithMessage(redirectPath, "Idea not found.", "error");
  }

  if (result.status === "already_exists") {
    return redirectWithMessage(redirectPath, "Drafts already exist for this idea.", "error");
  }

  revalidateDashboardPaths();
  redirectWithMessage(redirectPath, result.created > 0 ? `Generated ${result.created} draft(s).` : "No new drafts were created.", "success");
}

export async function sendIdeaToTelegramAction(formData: FormData) {
  const ideaId = String(formData.get("ideaId") ?? "");
  const redirectPath = String(formData.get("redirectPath") ?? "/ideas");

  if (!ideaId) {
    return redirectWithMessage(redirectPath, "Missing idea.", "error");
  }

  const idea = await prisma.idea.findUnique({
    where: { id: ideaId },
    include: { user: true },
  });

  if (!idea?.user.telegramChatId) {
    return redirectWithMessage(redirectPath, "No Telegram user is linked to this idea.", "error");
  }

  await prisma.user.update({
    where: { id: idea.userId },
    data: {
      pendingIdeaId: idea.id,
      pendingPlatformSelection: null,
      pendingStylePreset: null,
      pendingFormatPreset: null,
      pendingGenerationNote: null,
      awaitingGenerationNote: false,
      pendingScheduleDraftId: null,
      awaitingScheduleInput: false,
    },
  });

  await sendTelegramMessage(
    idea.user.telegramChatId,
    `Idea from dashboard:\n\n${idea.normalizedContent ?? idea.rawContent}\n\nChoose which platform you want a draft for.`,
    ideaPlatformKeyboard(idea.id),
  );

  redirectWithMessage(redirectPath, "Idea sent to Telegram.", "success");
}

export async function sendDraftToTelegramAction(formData: FormData) {
  const draftId = String(formData.get("draftId") ?? "");
  const redirectPath = String(formData.get("redirectPath") ?? "/drafts");

  if (!draftId) {
    return redirectWithMessage(redirectPath, "Missing draft.", "error");
  }

  const draft = await prisma.draft.findUnique({
    where: { id: draftId },
    include: { user: true },
  });

  if (!draft?.user.telegramChatId) {
    return redirectWithMessage(redirectPath, "No Telegram user is linked to this draft.", "error");
  }

  await sendDraftForReview(draft.user.telegramChatId, draft.id);
  redirectWithMessage(redirectPath, "Draft sent to Telegram.", "success");
}

export async function approveDraftAction(formData: FormData) {
  const draftId = String(formData.get("draftId") ?? "");
  const redirectPath = String(formData.get("redirectPath") ?? "/drafts");

  if (!draftId) {
    return redirectWithMessage(redirectPath, "Missing draft.", "error");
  }

  const draft = await prisma.draft.findUnique({ where: { id: draftId } });
  if (!draft) {
    return redirectWithMessage(redirectPath, "Draft not found.", "error");
  }

  await prisma.$transaction([
    prisma.draft.update({
      where: { id: draft.id },
      data: { status: "APPROVED" },
    }),
    prisma.feedbackEvent.create({
      data: {
        userId: draft.userId,
        draftId: draft.id,
        action: FeedbackAction.APPROVED,
      },
    }),
  ]);

  revalidateDashboardPaths();
  redirectWithMessage(redirectPath, "Draft approved.", "success");
}

export async function rejectDraftAction(formData: FormData) {
  const draftId = String(formData.get("draftId") ?? "");
  const redirectPath = String(formData.get("redirectPath") ?? "/drafts");

  if (!draftId) {
    return redirectWithMessage(redirectPath, "Missing draft.", "error");
  }

  const draft = await prisma.draft.findUnique({ where: { id: draftId } });
  if (!draft) {
    return redirectWithMessage(redirectPath, "Draft not found.", "error");
  }

  await prisma.$transaction([
    prisma.draft.update({
      where: { id: draft.id },
      data: { status: "REJECTED" },
    }),
    prisma.feedbackEvent.create({
      data: {
        userId: draft.userId,
        draftId: draft.id,
        action: FeedbackAction.REJECTED,
      },
    }),
  ]);

  revalidateDashboardPaths();
  redirectWithMessage(redirectPath, "Draft rejected.", "success");
}

export async function postDraftNowAction(formData: FormData) {
  const draftId = String(formData.get("draftId") ?? "");
  const redirectPath = String(formData.get("redirectPath") ?? "/drafts");

  if (!draftId) {
    return redirectWithMessage(redirectPath, "Missing draft.", "error");
  }

  const result = await publishDraftNow(draftId);
  revalidateDashboardPaths();

  if (result.status === "missing") {
    return redirectWithMessage(redirectPath, "Draft not found.", "error");
  }

  if (result.status === "already_posted") {
    return redirectWithMessage(redirectPath, "Draft was already posted.", "error");
  }

  if (result.status === "manual_fallback") {
    return redirectWithMessage(redirectPath, "Manual posting instructions were sent to Telegram.", "success");
  }

  if (result.status === "failed") {
    return redirectWithMessage(redirectPath, result.error ?? "Publishing failed.", "error");
  }

  redirectWithMessage(redirectPath, "Draft posted.", "success");
}

export async function scheduleDraftAction(formData: FormData) {
  const draftId = String(formData.get("draftId") ?? "");
  const redirectPath = String(formData.get("redirectPath") ?? "/drafts");
  const scheduledInput = String(formData.get("scheduledFor") ?? "");

  if (!draftId || !scheduledInput) {
    return redirectWithMessage(redirectPath, "Select a future date and time.", "error");
  }

  const draft = await prisma.draft.findUnique({
    where: { id: draftId },
    include: { user: true },
  });

  if (!draft?.user) {
    return redirectWithMessage(redirectPath, "Draft not found.", "error");
  }

  const parsed = parseDateTimeLocalInput(scheduledInput, draft.user.timezone);
  if (!parsed) {
    return redirectWithMessage(redirectPath, "Use a valid future date and time.", "error");
  }

  const scheduled = await schedulePostForDateTime(draft, draft.user, parsed.scheduledFor);
  await prisma.feedbackEvent.create({
    data: {
      userId: draft.userId,
      draftId: draft.id,
      action: FeedbackAction.SCHEDULED,
      notes: scheduled.label,
    },
  });

  revalidateDashboardPaths();
  redirectWithMessage(redirectPath, `Scheduled for ${scheduled.label}.`, "success");
}

export async function cancelScheduleAction(formData: FormData) {
  const jobId = String(formData.get("jobId") ?? "");
  const redirectPath = String(formData.get("redirectPath") ?? "/jobs");

  if (!jobId) {
    return redirectWithMessage(redirectPath, "Missing job.", "error");
  }

  const job = await prisma.postJob.findUnique({
    where: { id: jobId },
  });

  if (!job) {
    return redirectWithMessage(redirectPath, "Job not found.", "error");
  }

  if (job.status !== PostJobStatus.PENDING) {
    return redirectWithMessage(redirectPath, "Only pending jobs can be canceled.", "error");
  }

  await prisma.$transaction([
    prisma.postJob.delete({
      where: { id: job.id },
    }),
    prisma.draft.update({
      where: { id: job.draftId },
      data: {
        status: "PENDING_REVIEW",
        scheduledFor: null,
      },
    }),
  ]);

  revalidateDashboardPaths();
  redirectWithMessage(redirectPath, "Scheduled job canceled.", "success");
}

function revalidateDashboardPaths() {
  revalidatePath("/");
  revalidatePath("/ideas");
  revalidatePath("/drafts");
  revalidatePath("/jobs");
}

function redirectWithMessage(path: string, message: string, tone: "success" | "error") {
  redirect(`${path}?message=${encodeURIComponent(message)}&tone=${tone}`);
}
