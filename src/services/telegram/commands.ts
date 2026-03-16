import { publishDraftNow } from "@/services/posts/publisher";
import type { Draft } from "@prisma/client";
import { prisma } from "@/lib/db";
import { formatDateTime, startOfToday } from "@/lib/time";

export async function handleCommand(command: string, chatId: string) {
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
