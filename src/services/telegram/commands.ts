import { publishDraftNow } from "@/services/posts/publisher";
import type { Draft } from "@prisma/client";
import { prisma } from "@/lib/db";
import { formatDateTime, startOfToday } from "@/lib/time";
import { sendDraftForReview } from "@/services/telegram/handlers";
import { ideaPlatformKeyboard } from "@/services/telegram/keyboards";
import { sendTelegramMessage } from "@/services/telegram/bot";

export async function handleCommand(command: string, chatId: string, args = "") {
  switch (command) {
    case "/start":
      return "SignalToPost is active. Send any normal message and I will treat it as a content idea.";
    case "/help":
      return [
        "Commands:",
        "/start",
        "/help",
        "/cancel",
        "/idea",
        "/nextidea",
        "/review",
        "/githubideas",
        "/drafts",
        "/schedule",
        "/today",
        "/settings",
        "/postnow",
        "",
        "Scheduling examples:",
        "tomorrow 9",
        "monday 14:30",
        "in 2 hours",
        "",
        "GitHub idea automation:",
        "/githubideas",
        "/githubideas on",
        "/githubideas off",
      ].join("\n");
    case "/cancel": {
      const user = await prisma.user.findUnique({
        where: { telegramChatId: chatId },
      });

      if (!user?.pendingIdeaId && !user?.awaitingGenerationNote && !user?.pendingScheduleDraftId && !user?.awaitingScheduleInput) {
        return "No pending generation or scheduling flow to cancel.";
      }

      await prisma.user.update({
        where: { telegramChatId: chatId },
        data: {
          pendingIdeaId: null,
          pendingPlatformSelection: null,
          pendingStylePreset: null,
          pendingFormatPreset: null,
          pendingGenerationNote: null,
          awaitingGenerationNote: false,
          pendingScheduleDraftId: null,
          awaitingScheduleInput: false,
        },
      });

      return "Cancelled the pending flow.";
    }
    case "/idea":
      return "Send a normal message with your thought, build update, or lesson learned.";
    case "/nextidea": {
      const user = await prisma.user.findUnique({
        where: { telegramChatId: chatId },
      });

      if (!user) {
        return "No Telegram user is linked yet. Send a normal message first so I can create your profile.";
      }

      const idea = await prisma.idea.findFirst({
        where: {
          userId: user.id,
          source: "GITHUB",
          status: "NEW",
        },
        orderBy: { createdAt: "desc" },
      });

      if (!idea) {
        return "No new GitHub ideas are waiting right now.";
      }

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
        [
          "Next GitHub idea:",
          "",
          idea.normalizedContent ?? idea.rawContent,
          "",
          `Captured: ${formatDateTime(idea.createdAt, user.timezone)}`,
          "",
          "Choose which platform you want a draft for.",
        ].join("\n"),
        ideaPlatformKeyboard(idea.id),
      );

      return null;
    }
    case "/review": {
      const user = await prisma.user.findUnique({
        where: { telegramChatId: chatId },
      });

      if (!user) {
        return "No Telegram user is linked yet. Send a normal message first so I can create your profile.";
      }

      const drafts = await prisma.draft.findMany({
        where: {
          userId: user.id,
          status: "PENDING_REVIEW",
        },
        orderBy: [{ qualityScore: "desc" }, { createdAt: "desc" }],
      });

      if (drafts.length === 0) {
        return "No drafts are waiting for review right now.";
      }

      const lastIndex = user.lastReviewedDraftId
        ? drafts.findIndex((draft) => draft.id === user.lastReviewedDraftId)
        : -1;
      const nextDraft = drafts[(lastIndex + 1 + drafts.length) % drafts.length];

      await prisma.user.update({
        where: { id: user.id },
        data: {
          lastReviewedDraftId: nextDraft.id,
        },
      });

      await sendDraftForReview(chatId, nextDraft.id);
      return null;
    }
    case "/githubideas": {
      const user = await prisma.user.findUnique({
        where: { telegramChatId: chatId },
      });

      if (!user) {
        return "No Telegram user is linked yet. Send a normal message first so I can create your profile.";
      }

      const normalizedArgs = args.trim().toLowerCase();
      if (!normalizedArgs) {
        return `GitHub idea automation is currently ${user.githubIdeaAutomationEnabled ? "ON" : "OFF"}. Use /githubideas on or /githubideas off.`;
      }

      if (normalizedArgs !== "on" && normalizedArgs !== "off") {
        return "Use /githubideas on or /githubideas off.";
      }

      const enabled = normalizedArgs === "on";
      await prisma.user.update({
        where: { id: user.id },
        data: {
          githubIdeaAutomationEnabled: enabled,
        },
      });

      return `GitHub idea automation is now ${enabled ? "ON" : "OFF"}.`;
    }
    case "/drafts": {
      const drafts: Draft[] = await prisma.draft.findMany({
        where: {
          user: { telegramChatId: chatId },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      });

      if (drafts.length === 0) {
        return "No drafts yet.";
      }

      return drafts
        .map((draft) => `[${draft.platform}] ${draft.status}: ${draft.content}`)
        .join("\n\n");
    }
    case "/today": {
      const today = startOfToday();
      const ideas = await prisma.idea.count({
        where: {
          user: { telegramChatId: chatId },
          createdAt: { gte: today },
        },
      });

      const approvals = await prisma.draft.count({
        where: {
          user: { telegramChatId: chatId },
          status: "APPROVED",
          updatedAt: { gte: today },
        },
      });

      return `Today: ${ideas} idea(s) captured, ${approvals} draft(s) approved.`;
    }
    case "/settings": {
      const user = await prisma.user.findUnique({
        where: { telegramChatId: chatId },
      });

      return [
        `Timezone: ${user?.timezone ?? "not set"}`,
        `Telegram chat: ${chatId}`,
        "X posts can publish directly if API credentials are configured.",
        "LinkedIn uses manual publish fallback for now.",
        "Use /nextidea to pull the next GitHub idea into Telegram.",
        "Use /review to open the next draft waiting for review.",
        `GitHub idea automation: ${user?.githubIdeaAutomationEnabled ? "ON" : "OFF"}`,
      ].join("\n");
    }
    case "/schedule":
      {
        const jobs = await prisma.postJob.findMany({
          where: {
            user: { telegramChatId: chatId },
          },
          orderBy: { scheduledFor: "asc" },
          take: 5,
          include: { user: true, draft: true },
        });

        if (jobs.length === 0) {
          return "No scheduled drafts yet. Use the Schedule button on a draft to pick a slot or type a custom time phrase.";
        }

        return jobs
          .map(
            (job) =>
              `[${job.platform}] ${formatDateTime(job.scheduledFor, job.user.timezone)}: ${job.draft.content}`,
          )
          .join("\n\n");
      }
    case "/postnow":
      {
        const draft = await prisma.draft.findFirst({
          where: {
            user: { telegramChatId: chatId },
            status: {
              in: ["APPROVED", "SCHEDULED", "PENDING_REVIEW"],
            },
          },
          orderBy: { updatedAt: "desc" },
        });

        if (!draft) {
          return "No draft is ready for immediate publish. Approve or generate a draft first.";
        }

        const result = await publishDraftNow(draft.id);

        if (result.status === "already_posted") {
          return "The latest draft was already posted.";
        }

        if (result.status === "missing") {
          return "Could not find a draft to publish.";
        }

        if (result.status === "posted") {
          return `Posted the latest ${draft.platform} draft.`;
        }

        if (result.status === "manual_fallback") {
          return `The latest ${draft.platform} draft was prepared for manual publishing and sent to Telegram.`;
        }

        return `Publishing failed: ${result.error}`;
      }
    default:
      return "Unknown command. Use /help to see available commands.";
  }
}
