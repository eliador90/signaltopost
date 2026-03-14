import type { Draft } from "@prisma/client";
import { prisma } from "@/lib/db";
import { sendTelegramMessage } from "@/services/telegram/bot";

export async function runMorningDigestJob() {
  const user = await prisma.user.findFirst();
  if (!user) {
    return { sent: false, reason: "no_user" };
  }

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

  const digest = [
    "Good morning.",
    "",
    "Top drafts to review today:",
    ...drafts.map((draft, index) => `${index + 1}. [${draft.platform}] ${draft.content}`),
  ].join("\n");

  await sendTelegramMessage(user.telegramChatId, digest);
  return { sent: true, count: drafts.length };
}
