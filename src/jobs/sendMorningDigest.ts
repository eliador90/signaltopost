import type { Draft } from "@prisma/client";
import { prisma } from "@/lib/db";
import { isNearDuplicateDraft } from "@/services/ai/dedup";
import { runGenerateDraftsJob } from "@/jobs/generateDrafts";
import { sendTelegramMessage } from "@/services/telegram/bot";
import { sendDraftForReview } from "@/services/telegram/handlers";

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
    "<b>Good morning.</b>",
    "",
    githubSignals.length > 0 ? "<b>Top GitHub signals</b>" : "<b>GitHub signals</b>",
    ...(githubSignals.length > 0
      ? githubSignals.map(
          (idea, index) => `${index + 1}. ${escapeTelegramHtml(idea.normalizedContent ?? idea.rawContent)}`,
        )
      : ["No fresh GitHub signals yet."]),
    "",
    "<b>Review queue</b>",
    `I found ${uniqueDrafts.length} draft${uniqueDrafts.length === 1 ? "" : "s"} ready for review below.`,
    "",
    `Summary: ${githubSignals.length} recent GitHub signals and ${generated.processedIdeas} ideas turned into drafts.`,
  ].join("\n");

  await sendTelegramMessage(user.telegramChatId, digest, undefined, {
    parseMode: "HTML",
  });

  for (const draft of uniqueDrafts) {
    await sendDraftForReview(user.telegramChatId, draft.id);
  }
  return { sent: true, count: uniqueDrafts.length, generated };
}

function escapeTelegramHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
