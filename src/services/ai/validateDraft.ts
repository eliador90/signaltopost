import type { DraftPlatform } from "@prisma/client";

export type DraftValidation = {
  valid: boolean;
  hardErrors: string[];
  warnings: string[];
  metrics: {
    characters: number;
    lines: number;
    sentences: number;
  };
};

const genericPhrases = [
  "small but real progress",
  "not flashy",
  "practical improvement",
  "clear systems",
  "most people get this backward",
  "useful software",
  "this work matters",
  "compounds faster",
  "worth doing",
];

export function sanitizeDraftContent(content: string) {
  return content
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/^(post|draft|x post|linkedin post):\s*/i, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function validateDraftContent(content: string, platform: DraftPlatform): DraftValidation {
  const sanitized = sanitizeDraftContent(content);
  const lines = sanitized.split("\n").filter((line) => line.trim());
  const hardErrors: string[] = [];
  const warnings: string[] = [];
  const sentences = sanitized.split(/[.!?]+(?:\s|$)/).filter((part) => part.trim().length > 0).length;
  const lower = sanitized.toLowerCase();

  if (!sanitized) hardErrors.push("empty");

  if (platform === "X") {
    if (sanitized.length > 280) hardErrors.push("x_too_long");
    if (sentences > 4) warnings.push("too_many_sentences_for_x");
    if (lines.length > 5) warnings.push("too_many_lines_for_x");
  } else {
    if (sanitized.length > 1200) hardErrors.push("linkedin_too_long");
    if (sanitized.length < 180) warnings.push("linkedin_too_short");
    if (lines.length > 12) warnings.push("too_many_lines_for_linkedin");
  }

  if (genericPhrases.some((phrase) => lower.includes(phrase))) warnings.push("generic_repeated_phrase");
  if (/^(small|useful|good|quick)\b/i.test(sanitized)) warnings.push("generic_hook");
  if ((sanitized.match(/!/g) ?? []).length > 1) warnings.push("too_many_exclamations");
  if ((sanitized.match(/[—]/g) ?? []).length > 0) warnings.push("em_dash");

  return {
    valid: hardErrors.length === 0,
    hardErrors,
    warnings,
    metrics: {
      characters: sanitized.length,
      lines: lines.length,
      sentences,
    },
  };
}

export function repairDraftLocally(content: string, platform: DraftPlatform) {
  const sanitized = sanitizeDraftContent(content);
  if (platform !== "X" || sanitized.length <= 280) {
    return sanitized;
  }

  const sentences = sanitized.match(/[^.!?]+[.!?]*/g)?.map((part) => part.trim()).filter(Boolean) ?? [];
  let repaired = "";
  for (const sentence of sentences) {
    const next = repaired ? `${repaired} ${sentence}` : sentence;
    if (next.length <= 280) {
      repaired = next;
    }
  }

  if (repaired.length >= 80) {
    return repaired;
  }

  return `${sanitized.slice(0, 276).trimEnd()}...`;
}
