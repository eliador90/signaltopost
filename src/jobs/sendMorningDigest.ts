import type { Draft } from "@prisma/client";
import { prisma } from "@/lib/db";
import { isNearDuplicateDraft } from "@/services/ai/dedup";
import { runGenerateDraftsJob } from "@/jobs/generateDrafts";
import { sendTelegramMessage } from "@/services/telegram/bot";

export async function runMorningDigestJob() {
  const user = await prisma.user.findFirst();
  if (!user) {
    return { sent: false, reason: "no_user" };
  }

  const generated = await runGenerateDraftsJob();

  const drafts: Draft[] = await prisma.draft.findMany({
    where: {
      userId: user.id,
      status: "PENDING_REVIEW",
    },
    orderBy: [{ qualityScore: "desc" }, { createdAt: "desc" }],
    take: 3,
  });
  const uniqueDrafts = drafts.filter(
    (draft, index) => !isNearDuplicateDraft(draft.content, drafts.slice(0, index), 0.78),
  );

  if (uniqueDrafts.length === 0) {
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
    ...uniqueDrafts.map((draft, index) => `${index + 1}. [${draft.platform}] ${draft.content}`),
    "",
    `Summary: ${githubSignals.length} recent GitHub signals and ${generated.processedIdeas} ideas turned into drafts.`,
  ].join("\n");

  await sendTelegramMessage(user.telegramChatId, digest);
  return { sent: true, count: uniqueDrafts.length, generated };
}
