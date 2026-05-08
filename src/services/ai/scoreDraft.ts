import type { DraftPlatform } from "@prisma/client";
import type { TasteProfile } from "@/services/ai/taste";
import { validateDraftContent } from "@/services/ai/validateDraft";

export type DraftScore = {
  score: number;
  reasons: string[];
};

export function scoreDraft(content: string, platform: "x" | "linkedin", taste?: TasteProfile) {
  return evaluateDraft(content, platform === "x" ? "X" : "LINKEDIN", taste).score;
}

export function evaluateDraft(content: string, platform: DraftPlatform, taste?: TasteProfile): DraftScore {
  const validation = validateDraftContent(content, platform);
  const lower = content.toLowerCase();
  const reasons: string[] = [];
  let score = 0.72;

  if (validation.hardErrors.length > 0) {
    score -= 0.35;
    reasons.push(`hard:${validation.hardErrors.join(",")}`);
  }

  if (validation.warnings.length > 0) {
    score -= validation.warnings.length * 0.04;
    reasons.push(`warnings:${validation.warnings.join(",")}`);
  }

  if (/\b(i|my|we|our)\b/i.test(content)) {
    score += 0.05;
    reasons.push("has_personal_stance");
  }

  if (/\d/.test(content) || /\b(today|this week|recently|yesterday|now)\b/i.test(content)) {
    score += 0.04;
    reasons.push("concrete_time_or_number");
  }

  if (/\b(because|so that|which means|the result|the tradeoff)\b/i.test(content)) {
    score += 0.05;
    reasons.push("explains_implication");
  }

  if (/\b(founder|finance|cash|budget|runway|reporting|pricing|operations|workflow|customer|product)\b/i.test(content)) {
    score += 0.04;
    reasons.push("domain_relevant");
  }

  if (platform === "X" && content.length >= 120 && content.length <= 260) {
    score += 0.08;
    reasons.push("x_length_good");
  }

  if (platform === "LINKEDIN" && content.length >= 320 && content.length <= 900) {
    score += 0.08;
    reasons.push("linkedin_length_good");
  }

  if (/\b(synergy|leverage|disrupt|revolutionary|game[- ]changer|unlock|transformative)\b/i.test(content)) {
    score -= 0.18;
    reasons.push("buzzword_penalty");
  }

  if (/\b(not flashy|small but real|this work matters|practical improvement|clear systems)\b/i.test(content)) {
    score -= 0.16;
    reasons.push("known_generic_phrase");
  }

  for (const phrase of taste?.rejectedPhrases ?? []) {
    if (phrase.length > 3 && lower.includes(phrase.toLowerCase())) {
      score -= 0.06;
      reasons.push(`matches_rejected:${phrase}`);
    }
  }

  for (const phrase of taste?.approvedPhrases ?? []) {
    if (phrase.length > 3 && lower.includes(phrase.toLowerCase())) {
      score += 0.03;
      reasons.push(`matches_approved:${phrase}`);
    }
  }

  return {
    score: Math.max(0.05, Math.min(Number(score.toFixed(3)), 0.99)),
    reasons,
  };
}
