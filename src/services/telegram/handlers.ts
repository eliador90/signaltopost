import { DraftPlatform, FeedbackAction } from "@prisma/client";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { generateDraftsForPlatforms } from "@/services/ai/generateDrafts";
import { rewriteDraft } from "@/services/ai/rewriteDraft";
import { createIdea } from "@/services/ideas/create";
import { formatDateTime } from "@/lib/time";
import { schedulePost, type SchedulePreset } from "@/services/posts/scheduler";
import { normalizeIdea } from "@/services/ideas/normalize";
import { answerCallbackQuery, sendTelegramMessage } from "@/services/telegram/bot";
import { handleCommand } from "@/services/telegram/commands";
import { draftKeyboard, ideaPlatformKeyboard, scheduleKeyboard } from "@/services/telegram/keyboards";
import { isCommand, parseCommand } from "@/services/telegram/parser";
import type { TelegramCallbackQuery, TelegramMessage, TelegramUpdate } from "@/types/telegram";

export async function handleTelegramUpdate(update: TelegramUpdate) {
  if (update.message) {
    await handleIncomingMessage(update.message);
  }

  if (update.callback_query) {
    await handleCallback(update.callback_query);
  }
}

async function handleIncomingMessage(message: TelegramMessage) {
  const text = message.text?.trim();
  if (!text) return;

  const chatId = String(message.chat.id);
  if (!isAllowedChat(chatId)) {
    logger.warn("Rejected Telegram message from unauthorized chat", { chatId });
    return;
  }

  if (isCommand(text)) {
    const parsed = parseCommand(text);
    const response = await handleCommand(parsed.command, chatId);
    await sendTelegramMessage(chatId, response);
    return;
  }

  const user = await prisma.user.upsert({
    where: { telegramChatId: chatId },
    create: {
      telegramChatId: chatId,
      name: message.from?.first_name ?? message.from?.username ?? "SignalToPost User",
      timezone: "Europe/Zurich",
    },
    update: {
      name: message.from?.first_name ?? message.from?.username ?? undefined,
    },
  });

  const normalizedContent = await normalizeIdea(text);
  const idea = await createIdea({
    user,
    rawContent: text,
    normalizedContent,
  });

  await sendTelegramMessage(
    chatId,
    "Idea saved. Which platform do you want a draft for?",
    ideaPlatformKeyboard(idea.id),
  );
}

async function handleCallback(callbackQuery: TelegramCallbackQuery) {
  const data = callbackQuery.data;
  const chatId = callbackQuery.message?.chat?.id ? String(callbackQuery.message.chat.id) : null;

  if (!data || !chatId || !isAllowedChat(chatId)) {
    return;
  }

  const [scope, action, draftId] = data.split(":");
  if (scope === "idea") {
    await handleIdeaCallback(callbackQuery, action, draftId, chatId);
    return;
  }

  if (scope !== "draft") {
    return;
  }

  const draft = await prisma.draft.findUnique({
    where: { id: draftId },
    include: { user: true },
  });

  if (!draft || draft.user.telegramChatId !== chatId) {
    await answerCallbackQuery(callbackQuery.id, "Draft not found.");
    return;
  }

  switch (action) {
    case "approve":
      await prisma.draft.update({
        where: { id: draft.id },
        data: { status: "APPROVED" },
      });
      await prisma.feedbackEvent.create({
        data: {
          userId: draft.userId,
          draftId: draft.id,
          action: FeedbackAction.APPROVED,
        },
      });
      await answerCallbackQuery(callbackQuery.id, "Draft approved");
      await sendTelegramMessage(chatId, `Approved ${draft.platform} draft.`);
      return;
    case "reject":
      await prisma.draft.update({
        where: { id: draft.id },
        data: { status: "REJECTED" },
      });
      await prisma.feedbackEvent.create({
        data: {
          userId: draft.userId,
          draftId: draft.id,
          action: FeedbackAction.REJECTED,
        },
      });
      await answerCallbackQuery(callbackQuery.id, "Draft rejected");
      await sendTelegramMessage(chatId, `Rejected ${draft.platform} draft.`);
      return;
    case "schedule_options":
      await answerCallbackQuery(callbackQuery.id, "Choose a schedule slot");
      await sendTelegramMessage(chatId, "Choose when to queue this draft.", scheduleKeyboard(draft.id));
      return;
    case "schedule_tomorrow_0900":
    case "schedule_tomorrow_1400": {
      const preset = action.replace("schedule_", "") as SchedulePreset;
      const scheduled = await schedulePost(draft, draft.user, preset);
      await prisma.feedbackEvent.create({
        data: {
          userId: draft.userId,
          draftId: draft.id,
          action: FeedbackAction.SCHEDULED,
          notes: scheduled.label,
        },
      });
      await answerCallbackQuery(callbackQuery.id, "Draft scheduled");
      await sendTelegramMessage(
        chatId,
        `Scheduled ${draft.platform} draft for ${scheduled.label}. Publishing is still manual / Phase 3.`,
      );
      return;
    }
    case "show_actions":
      await answerCallbackQuery(callbackQuery.id, "Showing actions");
      await sendDraftForReview(chatId, draft.id);
      return;
    case "rewrite_shorter":
      await rewriteAndResendDraft(draft.id, draft.userId, chatId, "shorter", FeedbackAction.REWRITTEN_SHORTER);
      await answerCallbackQuery(callbackQuery.id, "Rewritten shorter");
      return;
    case "rewrite_sharper":
      await rewriteAndResendDraft(draft.id, draft.userId, chatId, "sharper", FeedbackAction.REWRITTEN_SHARPER);
      await answerCallbackQuery(callbackQuery.id, "Rewritten sharper");
      return;
    case "rewrite_personal":
      await rewriteAndResendDraft(
        draft.id,
        draft.userId,
        chatId,
        "more like me",
        FeedbackAction.REWRITTEN_MORE_PERSONAL,
      );
      await answerCallbackQuery(callbackQuery.id, "Rewritten more like you");
      return;
    default:
      await answerCallbackQuery(callbackQuery.id, "Unknown action.");
  }
}

async function handleIdeaCallback(
  callbackQuery: TelegramCallbackQuery,
  action: string,
  ideaId: string,
  chatId: string,
) {
  const idea = await prisma.idea.findUnique({
    where: { id: ideaId },
    include: { user: true },
  });

  if (!idea || idea.user.telegramChatId !== chatId) {
    await answerCallbackQuery(callbackQuery.id, "Idea not found.");
    return;
  }

  const existingDrafts = await prisma.draft.count({
    where: { sourceIdeaId: idea.id },
  });

  if (existingDrafts > 0) {
    await answerCallbackQuery(callbackQuery.id, "Drafts already created for this idea.");
    return;
  }

  const platforms = getPlatformsForAction(action);
  if (!platforms) {
    await answerCallbackQuery(callbackQuery.id, "Unknown platform selection.");
    return;
  }

  await answerCallbackQuery(callbackQuery.id, "Generating drafts");
  await sendTelegramMessage(
    chatId,
    `Generating ${platforms.length === 2 ? "X and LinkedIn" : platforms[0]} draft${
      platforms.length === 1 ? "" : "s"
    } now.`,
  );

  const source = idea.normalizedContent ?? idea.rawContent;
  const drafts = await generateDraftsForPlatforms(platforms, source);

  for (const draft of drafts) {
    const storedDraft = await prisma.draft.create({
      data: {
        userId: idea.userId,
        platform: draft.platform,
        content: draft.content,
        sourceIdeaId: idea.id,
        status: "PENDING_REVIEW",
        qualityScore: draft.qualityScore,
      },
    });

    await sendDraftForReview(chatId, storedDraft.id);
  }

  await prisma.idea.update({
    where: { id: idea.id },
    data: {
      status: "PROCESSED",
      processedAt: new Date(),
    },
  });
}

async function rewriteAndResendDraft(
  draftId: string,
  userId: string,
  chatId: string,
  direction: string,
  action: FeedbackAction,
) {
  const draft = await prisma.draft.findUnique({ where: { id: draftId } });
  if (!draft) return;

  const rewritten = await rewriteDraft(draft.content, direction);

  await prisma.draft.update({
    where: { id: draft.id },
    data: {
      content: rewritten,
      status: "PENDING_REVIEW",
      scheduledFor: null,
    },
  });

  await prisma.postJob.deleteMany({
    where: {
      draftId,
      status: "PENDING",
    },
  });

  await prisma.feedbackEvent.create({
    data: {
      userId,
      draftId,
      action,
      notes: direction,
    },
  });

  await sendDraftForReview(chatId, draftId);
}

export async function sendDraftForReview(chatId: string, draftId: string) {
  const draft = await prisma.draft.findUnique({
    where: { id: draftId },
    include: { sourceIdea: true, user: true },
  });

  if (!draft) return;

  const title = draft.platform === "X" ? "Draft for X" : "Draft for LinkedIn";
  const sourceLine = draft.sourceIdea
    ? `Source: ${draft.sourceIdea.normalizedContent ?? draft.sourceIdea.rawContent}`
    : "Source: manual";

  const body = [title, sourceLine, "", draft.content].join("\n");
  const footer =
    draft.scheduledFor && draft.status === "SCHEDULED"
      ? `\n\nScheduled for ${formatDateTime(draft.scheduledFor, draft.user?.timezone ?? "Europe/Zurich")}`
      : "";

  await sendTelegramMessage(chatId, `${body}${footer}`, draftKeyboard(draft.id));
}

function isAllowedChat(chatId: string) {
  const allowedChatId = process.env.TELEGRAM_ALLOWED_CHAT_ID;
  return !allowedChatId || allowedChatId === chatId;
}

function getPlatformsForAction(action: string) {
  switch (action) {
    case "draft_x":
      return [DraftPlatform.X];
    case "draft_linkedin":
      return [DraftPlatform.LINKEDIN];
    case "draft_both":
      return [DraftPlatform.X, DraftPlatform.LINKEDIN];
    default:
      return null;
  }
}
