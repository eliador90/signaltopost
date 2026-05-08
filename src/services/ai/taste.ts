import type { DraftPlatform } from "@prisma/client";
import { prisma } from "@/lib/db";

export const rejectionReasonLabels = {
  too_generic: "Too generic",
  too_long: "Too long",
  weak_hook: "Weak hook",
  wrong_angle: "Wrong angle",
  not_worth_posting: "Not worth posting",
} as const;

export type RejectionReason = keyof typeof rejectionReasonLabels;

export type TasteProfile = {
  approvedExamples: string[];
  rejectedExamples: string[];
  rejectionReasons: string[];
  approvedPhrases: string[];
  rejectedPhrases: string[];
};

const stopWords = new Set([
  "the",
  "and",
  "for",
  "that",
  "this",
  "with",
  "from",
  "you",
  "your",
  "but",
  "not",
  "are",
  "was",
  "were",
  "into",
  "when",
  "what",
  "more",
  "than",
  "they",
  "them",
  "then",
  "have",
  "has",
  "had",
]);

export async function buildTasteProfile(userId: string, platform: DraftPlatform): Promise<TasteProfile> {
  const [approvedDrafts, rejectedDrafts, feedback] = await Promise.all([
    prisma.draft.findMany({
      where: {
        userId,
        platform,
        status: { in: ["APPROVED", "POSTED"] },
      },
      orderBy: { updatedAt: "desc" },
      take: 6,
      select: { content: true },
    }),
    prisma.draft.findMany({
      where: {
        userId,
        platform,
        status: "REJECTED",
      },
      orderBy: { updatedAt: "desc" },
      take: 12,
      select: { content: true },
    }),
    prisma.feedbackEvent.findMany({
      where: {
        userId,
        draft: { platform },
        action: "REJECTED",
      },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { reason: true },
    }),
  ]);

  const rejectionReasons = feedback
    .map((event) => event.reason)
    .filter((reason): reason is string => Boolean(reason))
    .slice(0, 8);

  return {
    approvedExamples: approvedDrafts.map((draft) => draft.content).slice(0, 4),
    rejectedExamples: rejectedDrafts.map((draft) => draft.content).slice(0, 6),
    rejectionReasons,
    approvedPhrases: extractPhrases(approvedDrafts.map((draft) => draft.content), 5),
    rejectedPhrases: extractPhrases(rejectedDrafts.map((draft) => draft.content), 8),
  };
}

export function buildTasteInstruction(taste?: TasteProfile | null) {
  if (!taste) return "";

  const blocks = [
    taste.rejectionReasons.length > 0
      ? `Recent rejection reasons: ${taste.rejectionReasons.join(", ")}. Avoid repeating those failure modes.`
      : null,
    taste.approvedExamples.length > 0
      ? [
          "Approved examples to learn from:",
          ...taste.approvedExamples.map((example, index) => `${index + 1}. ${compactExample(example)}`),
        ].join("\n")
      : null,
    taste.rejectedExamples.length > 0
      ? [
          "Rejected examples to avoid imitating:",
          ...taste.rejectedExamples.slice(0, 4).map((example, index) => `${index + 1}. ${compactExample(example)}`),
        ].join("\n")
      : null,
  ].filter(Boolean);

  return blocks.length > 0 ? blocks.join("\n\n") : "";
}

function compactExample(value: string) {
  return value.replace(/\s+/g, " ").slice(0, 260);
}

function extractPhrases(examples: string[], limit: number) {
  const counts = new Map<string, number>();

  for (const example of examples) {
    const tokens = example
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((token) => token.length > 3 && !stopWords.has(token));

    for (let index = 0; index < tokens.length - 1; index += 1) {
      const phrase = `${tokens[index]} ${tokens[index + 1]}`;
      counts.set(phrase, (counts.get(phrase) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .filter(([, count]) => count > 1)
    .slice(0, limit)
    .map(([phrase]) => phrase);
}
