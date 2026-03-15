import type { Draft } from "@prisma/client";
import { prisma } from "@/lib/db";
import { runGenerateDraftsJob } from "@/jobs/generateDrafts";
import { runGithubSyncJob } from "@/jobs/syncGithub";
import { sendTelegramMessage } from "@/services/telegram/bot";

export async function runMorningDigestJob() {
  const user = await prisma.user.findFirst();
  if (!user) {
    return { sent: false, reason: "no_user" };
  }

  const githubSync = await runGithubSyncJob();
  const generated = await runGenerateDraftsJob();

  const drafts: Draft[] = await prisma.draft.findMany({
    where: {
      userId: user.id,
      status: "PENDING_REVIEW",
    },
    orderBy: [{ qualityScore: "desc" }, { createdAt: "desc" }],
    take: 3,
  });

  if (drafts.length === 0) {
    return { sent: false, reason: "no_pending_drafts" };
  }

  const githubSignals = await prisma.idea.findMany({
    where: {
      userId: user.id,
      source: "GITHUB",
    },
    orderBy: { createdAt: "desc" },
    take: 2,
  });

  const digest = [
    "Good morning.",
    "",
    githubSignals.length > 0 ? "Top GitHub signals:" : "No fresh GitHub signals yet.",
    ...githubSignals.map((idea, index) => `${index + 1}. ${idea.normalizedContent ?? idea.rawContent}`),
    "",
    "Top drafts to review today:",
    ...drafts.map((draft, index) => `${index + 1}. [${draft.platform}] ${draft.content}`),
    "",
    `Sync summary: ${githubSync.synced} GitHub events, ${generated.processedIdeas} ideas turned into drafts.`,
  ].join("\n");

  await sendTelegramMessage(user.telegramChatId, digest);
  return { sent: true, count: drafts.length, githubSync, generated };
}
