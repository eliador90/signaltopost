import { DraftPlatform, FeedbackAction, PendingPlatformSelection } from "@prisma/client";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { buildDraftSourceFromIdea, generateDraftsForPlatforms } from "@/services/ai/generateDrafts";
import { getFormatPreset, getStylePreset } from "@/services/ai/presets";
import { rewriteDraft } from "@/services/ai/rewriteDraft";
import { createIdea } from "@/services/ideas/create";
import { formatDateTime, parseNaturalLanguageSchedule } from "@/lib/time";
import { publishDraftNow } from "@/services/posts/publisher";
import { schedulePost, schedulePostForDateTime, type SchedulePreset } from "@/services/posts/scheduler";
import { normalizeIdea } from "@/services/ideas/normalize";
import { answerCallbackQuery, sendTelegramMessage } from "@/services/telegram/bot";
import { handleCommand } from "@/services/telegram/commands";
import {
  draftKeyboard,
  draftPreferenceLine,
  formatPresetKeyboard,
  generationSummaryKeyboard,
  ideaPlatformKeyboard,
  scheduleKeyboard,
  stylePresetKeyboard,
} from "@/services/telegram/keyboards";
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

  if (isCommand(text)) {
    const parsed = parseCommand(text);
    const response = await handleCommand(parsed.command, chatId, parsed.args);
    if (response) {
      await sendTelegramMessage(chatId, response);
    }
    return;
  }

  if (user.awaitingGenerationNote && user.pendingIdeaId) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        pendingGenerationNote: text,
        awaitingGenerationNote: false,
      },
    });

    const refreshedUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!refreshedUser) return;

    await sendTelegramMessage(chatId, "Note saved. Generating your draft now.");
    await generatePendingIdeaDrafts(refreshedUser, chatId);
    return;
  }

  if (user.awaitingScheduleInput && user.pendingScheduleDraftId) {
    const draft = await prisma.draft.findUnique({
      where: { id: user.pendingScheduleDraftId },
    });

    if (!draft || draft.userId !== user.id) {
      await clearPendingSchedule(user.id);
      await sendTelegramMessage(chatId, "I could not find the draft you wanted to schedule anymore.");
      return;
    }

    const parsedSchedule = parseNaturalLanguageSchedule(text, user.timezone);
    if (!parsedSchedule) {
      await sendTelegramMessage(
        chatId,
        "I could not understand that time. Try something like 'tomorrow 9', 'monday 14:30', 'in 2 hours', or '2026-03-18 09:00'. Use /cancel to stop.",
      );
      return;
    }

    const scheduled = await schedulePostForDateTime(draft, user, parsedSchedule.scheduledFor);
    await prisma.feedbackEvent.create({
      data: {
        userId: draft.userId,
        draftId: draft.id,
        action: FeedbackAction.SCHEDULED,
        notes: scheduled.label,
      },
    });
    await clearPendingSchedule(user.id);
    await sendTelegramMessage(
      chatId,
      `Scheduled ${draft.platform} draft for ${scheduled.label}. It will publish when due or fall back to manual delivery if direct posting is unavailable.`,
    );
    return;
  }

  const normalizedContent = await normalizeIdea(text);
  const idea = await createIdea({
    user,
    rawContent: text,
    normalizedContent,
  });

  await prisma.user.update({
    where: { id: user.id },
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
      await sendTelegramMessage(
        chatId,
        "Choose a slot or type your own time phrase like 'tomorrow 9', 'friday 14:30', or 'in 2 hours'.",
        scheduleKeyboard(draft.id),
      );
      return;
    case "schedule_custom":
      await prisma.user.update({
        where: { id: draft.userId },
        data: {
          pendingScheduleDraftId: draft.id,
          awaitingScheduleInput: true,
          pendingIdeaId: null,
          pendingPlatformSelection: null,
          pendingStylePreset: null,
          pendingFormatPreset: null,
          pendingGenerationNote: null,
          awaitingGenerationNote: false,
        },
      });
      await answerCallbackQuery(callbackQuery.id, "Send a schedule time");
      await sendTelegramMessage(
        chatId,
        "Send when this should publish. Examples: 'tomorrow 9', 'monday 14:30', 'in 2 hours', or '2026-03-18 09:00'. Use /cancel to stop.",
      );
      return;
    case "post_now": {
      await answerCallbackQuery(callbackQuery.id, "Publishing now");
      const result = await publishDraftNow(draft.id);
      if (result.status === "already_posted") {
        await sendTelegramMessage(chatId, `This ${draft.platform} draft was already posted.`);
      }
      return;
    }
    case "schedule_tomorrow_0900":
    case "schedule_tomorrow_1400": {
      const preset = action.replace("schedule_", "") as SchedulePreset;
      const scheduled = await schedulePost(draft, draft.user, preset);
      await clearPendingSchedule(draft.userId);
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
        `Scheduled ${draft.platform} draft for ${scheduled.label}. It will publish when due or fall back to manual delivery if direct posting is unavailable.`,
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
    case "rewrite_calmer":
      await rewriteAndResendDraft(draft.id, draft.userId, chatId, "calmer", FeedbackAction.EDITED);
      await answerCallbackQuery(callbackQuery.id, "Rewritten calmer");
      return;
    case "rewrite_hook":
      await rewriteAndResendDraft(draft.id, draft.userId, chatId, "stronger hook", FeedbackAction.EDITED);
      await answerCallbackQuery(callbackQuery.id, "Rewritten with stronger hook");
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

  const user = await prisma.user.findUnique({ where: { id: idea.userId } });
  if (!user) {
    await answerCallbackQuery(callbackQuery.id, "User not found.");
    return;
  }

  const existingDrafts = await prisma.draft.count({ where: { sourceIdeaId: idea.id } });
  if (existingDrafts > 0) {
    await answerCallbackQuery(callbackQuery.id, "Drafts already created for this idea.");
    return;
  }

  switch (action) {
    case "platform_x":
    case "platform_linkedin":
    case "platform_both": {
      const platformSelection = getPendingPlatformSelection(action);
      if (!platformSelection) {
        await answerCallbackQuery(callbackQuery.id, "Unknown platform selection.");
        return;
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          pendingIdeaId: idea.id,
          pendingPlatformSelection: platformSelection,
          pendingStylePreset: null,
          pendingFormatPreset: null,
          pendingGenerationNote: null,
          awaitingGenerationNote: false,
        },
      });
      await answerCallbackQuery(callbackQuery.id, "Platform saved");
      await sendTelegramMessage(chatId, "Choose a style preset.", stylePresetKeyboard(idea.id));
      return;
    }
    case "back_to_platform":
      await answerCallbackQuery(callbackQuery.id, "Choose a platform");
      await sendTelegramMessage(chatId, "Which platform do you want a draft for?", ideaPlatformKeyboard(idea.id));
      return;
    case "back_to_style":
      await answerCallbackQuery(callbackQuery.id, "Choose a style");
      await sendTelegramMessage(chatId, "Choose a style preset.", stylePresetKeyboard(idea.id));
      return;
    case "back_to_format":
      await answerCallbackQuery(callbackQuery.id, "Choose a format");
      await sendTelegramMessage(chatId, "Choose a format preset.", formatPresetKeyboard(idea.id));
      return;
    case "add_note":
      await prisma.user.update({
        where: { id: user.id },
        data: {
          awaitingGenerationNote: true,
        },
      });
      await answerCallbackQuery(callbackQuery.id, "Waiting for your note");
      await sendTelegramMessage(
        chatId,
        "Send one short note for this generation, for example 'more contrarian' or 'no bullets'. Use /cancel to stop.",
      );
      return;
    case "use_defaults":
      await savePendingSelectionAsDefaults(user.id);
      await answerCallbackQuery(callbackQuery.id, "Defaults saved");
      await sendTelegramMessage(chatId, "Saved these style and format defaults for future drafts.");
      return;
    case "generate":
      await answerCallbackQuery(callbackQuery.id, "Generating drafts");
      await generatePendingIdeaDrafts(user, chatId);
      return;
    default:
      if (action.startsWith("style_")) {
        await prisma.user.update({
          where: { id: user.id },
          data: { pendingStylePreset: action.replace("style_", "") },
        });
        await answerCallbackQuery(callbackQuery.id, "Style saved");
        await sendTelegramMessage(chatId, "Choose a format preset.", formatPresetKeyboard(idea.id));
        return;
      }

      if (action.startsWith("format_")) {
        await prisma.user.update({
          where: { id: user.id },
          data: { pendingFormatPreset: action.replace("format_", "") },
        });
        await answerCallbackQuery(callbackQuery.id, "Format saved");
        const refreshedUser = await prisma.user.findUnique({ where: { id: user.id } });
        if (!refreshedUser) return;
        await sendTelegramMessage(
          chatId,
          buildPendingSummary(refreshedUser),
          generationSummaryKeyboard(idea.id),
        );
        return;
      }

      await answerCallbackQuery(callbackQuery.id, "Unknown selection.");
  }
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

  const rewritten = await rewriteDraft(draft, direction);

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
  const preferenceLine = draftPreferenceLine(draft.stylePreset, draft.formatPreset);
  const noteLine = draft.generationNote ? `Note: ${draft.generationNote}` : null;
  const body = [
    `<b>${escapeTelegramHtml(title)}</b>`,
    "",
    "<b>Source</b>",
    escapeTelegramHtml(sourceLine.replace(/^Source:\s*/, "")),
    "",
    "<b>Settings</b>",
    escapeTelegramHtml(preferenceLine),
    noteLine ? escapeTelegramHtml(noteLine) : null,
    "",
    "<b>Post</b>",
    escapeTelegramHtml(draft.content),
  ]
    .filter(Boolean)
    .join("\n");
  const footer =
    draft.scheduledFor && draft.status === "SCHEDULED"
      ? `\n\n<b>Schedule</b>\n${escapeTelegramHtml(
          `Scheduled for ${formatDateTime(draft.scheduledFor, draft.user?.timezone ?? "Europe/Zurich")}`,
        )}`
      : "";

  await sendTelegramMessage(chatId, `${body}${footer}`, draftKeyboard(draft.id), {
    parseMode: "HTML",
  });
}

function isAllowedChat(chatId: string) {
  const allowedChatId = process.env.TELEGRAM_ALLOWED_CHAT_ID;
  return !allowedChatId || allowedChatId === chatId;
}

function getPendingPlatformSelection(action: string) {
  switch (action) {
    case "platform_x":
      return PendingPlatformSelection.X;
    case "platform_linkedin":
      return PendingPlatformSelection.LINKEDIN;
    case "platform_both":
      return PendingPlatformSelection.BOTH;
    default:
      return null;
  }
}

async function generatePendingIdeaDrafts(
  user: {
    id: string;
    pendingIdeaId: string | null;
    pendingPlatformSelection: PendingPlatformSelection | null;
    pendingStylePreset: string | null;
    pendingFormatPreset: string | null;
    pendingGenerationNote: string | null;
    defaultXStylePreset?: string | null;
    defaultXFormatPreset?: string | null;
    defaultLinkedInStylePreset?: string | null;
    defaultLinkedInFormatPreset?: string | null;
  },
  chatId: string,
) {
  if (!user.pendingIdeaId || !user.pendingPlatformSelection) {
    await sendTelegramMessage(chatId, "No pending idea is ready to generate.");
    return;
  }

  const idea = await prisma.idea.findUnique({
    where: { id: user.pendingIdeaId },
    include: { user: true },
  });

  if (!idea || idea.user.telegramChatId !== chatId) {
    await sendTelegramMessage(chatId, "The pending idea could not be found.");
    return;
  }

  const existingDrafts = await prisma.draft.count({ where: { sourceIdeaId: idea.id } });
  if (existingDrafts > 0) {
    await clearPendingSelection(user.id);
    await sendTelegramMessage(chatId, "Drafts already exist for this idea.");
    return;
  }

  const platforms = getPlatformsForPendingSelection(user.pendingPlatformSelection);
  await sendTelegramMessage(
    chatId,
    `Generating ${platforms.length === 2 ? "X and LinkedIn" : getPlatformLabel(platforms[0])} draft${
      platforms.length === 1 ? "" : "s"
    } now.`,
  );

  const source = buildDraftSourceFromIdea(idea);
  const drafts = await generateDraftsForPlatforms(platforms, source, {
    user: idea.user,
    preferences: {
      stylePresetId: user.pendingStylePreset,
      formatPresetId: user.pendingFormatPreset,
      generationNote: user.pendingGenerationNote,
    },
  });

  for (const draft of drafts) {
    const storedDraft = await prisma.draft.create({
      data: {
        userId: idea.userId,
        platform: draft.platform,
        content: draft.content,
        sourceIdeaId: idea.id,
        status: "PENDING_REVIEW",
        qualityScore: draft.qualityScore,
        stylePreset: draft.stylePreset,
        formatPreset: draft.formatPreset,
        generationNote: draft.generationNote,
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

  await clearPendingSelection(user.id);
}

function getPlatformsForPendingSelection(selection: PendingPlatformSelection) {
  switch (selection) {
    case PendingPlatformSelection.X:
      return [DraftPlatform.X];
    case PendingPlatformSelection.LINKEDIN:
      return [DraftPlatform.LINKEDIN];
    case PendingPlatformSelection.BOTH:
      return [DraftPlatform.X, DraftPlatform.LINKEDIN];
  }
}

function buildPendingSummary(user: {
  pendingPlatformSelection: PendingPlatformSelection | null;
  pendingStylePreset: string | null;
  pendingFormatPreset: string | null;
  pendingGenerationNote: string | null;
}) {
  const platformLabel =
    user.pendingPlatformSelection === PendingPlatformSelection.BOTH
      ? "X and LinkedIn"
      : user.pendingPlatformSelection === PendingPlatformSelection.X
        ? "X"
        : "LinkedIn";

  return [
    "Ready to generate.",
    `Platform: ${platformLabel}`,
    `Style: ${getStylePreset(user.pendingStylePreset).label}`,
    `Format: ${getFormatPreset(user.pendingFormatPreset).label}`,
    user.pendingGenerationNote ? `Note: ${user.pendingGenerationNote}` : "Note: none",
  ].join("\n");
}

function getPlatformLabel(platform: DraftPlatform) {
  return platform === DraftPlatform.X ? "X" : "LinkedIn";
}

async function clearPendingSelection(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      pendingIdeaId: null,
      pendingPlatformSelection: null,
      pendingStylePreset: null,
      pendingFormatPreset: null,
      pendingGenerationNote: null,
      awaitingGenerationNote: false,
    },
  });
}

async function clearPendingSchedule(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      pendingScheduleDraftId: null,
      awaitingScheduleInput: false,
    },
  });
}

async function savePendingSelectionAsDefaults(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.pendingStylePreset || !user.pendingFormatPreset || !user.pendingPlatformSelection) {
    return;
  }

  const stylePreset = user.pendingStylePreset;
  const formatPreset = user.pendingFormatPreset;

  if (user.pendingPlatformSelection === PendingPlatformSelection.BOTH) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        defaultXStylePreset: stylePreset,
        defaultXFormatPreset: formatPreset,
        defaultLinkedInStylePreset: stylePreset,
        defaultLinkedInFormatPreset: formatPreset,
      },
    });
    return;
  }

  if (user.pendingPlatformSelection === PendingPlatformSelection.X) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        defaultXStylePreset: stylePreset,
        defaultXFormatPreset: formatPreset,
      },
    });
    return;
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      defaultLinkedInStylePreset: stylePreset,
      defaultLinkedInFormatPreset: formatPreset,
    },
  });
}

function escapeTelegramHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
