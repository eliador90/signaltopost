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
        "/idea",
        "/drafts",
        "/schedule",
        "/today",
        "/settings",
        "/postnow",
      ].join("\n");
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
        "LinkedIn direct posting is not implemented yet.",
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
          return "No scheduled drafts yet. Use the Schedule button on a draft to queue it for tomorrow.";
        }

        return jobs
          .map(
            (job) =>
              `[${job.platform}] ${formatDateTime(job.scheduledFor, job.user.timezone)}: ${job.draft.content}`,
          )
          .join("\n\n");
      }
    case "/postnow":
      return "Direct posting adapters come in Phase 3. For now, SignalToPost focuses on review quality.";
    default:
      return "Unknown command. Use /help to see available commands.";
  }
}
