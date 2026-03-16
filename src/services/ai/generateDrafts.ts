import { IdeaSource, DraftPlatform, type Idea, type User } from "@prisma/client";
import { generateText } from "@/services/ai/client";
import {
  resolveGenerationPreferences,
  type GenerationPreferenceOverrides,
  type ResolvedGenerationPreferences,
} from "@/services/ai/presets";
import { buildLinkedInDraftPrompt } from "@/services/ai/prompts/draft_linkedin";
import { buildXDraftPrompt } from "@/services/ai/prompts/draft_x";
import { scoreDraft } from "@/services/ai/scoreDraft";

type GenerationContext = {
  user?: Pick<
    User,
    "defaultXStylePreset" | "defaultXFormatPreset" | "defaultLinkedInStylePreset" | "defaultLinkedInFormatPreset"
  > | null;
  preferences?: GenerationPreferenceOverrides;
};

export async function generateDraftPair(source: string, context?: GenerationContext) {
  const [xDraft, linkedInDraft] = await Promise.all([
    generatePlatformDraft(DraftPlatform.X, source, context),
    generatePlatformDraft(DraftPlatform.LINKEDIN, source, context),
  ]);

  return [xDraft, linkedInDraft];
}

export async function generatePlatformDraft(platform: DraftPlatform, source: string, context?: GenerationContext) {
  const resolvedPreferences = resolveGenerationPreferences(platform, context?.user, context?.preferences);
  const prompt =
    platform === DraftPlatform.X
      ? buildXDraftPrompt(source, resolvedPreferences)
      : buildLinkedInDraftPrompt(source, resolvedPreferences);

  const generated = await generateText(prompt);
  const content = generated || fallbackDraft(source, platform);
  const qualityScore = scoreDraft(content, platform === DraftPlatform.X ? "x" : "linkedin");

  return buildDraftResult(platform, content, qualityScore, resolvedPreferences);
}

export async function generateDraftsForPlatforms(
  platforms: DraftPlatform[],
  source: string,
  context?: GenerationContext,
) {
  const drafts = await Promise.all(platforms.map((platform) => generatePlatformDraft(platform, source, context)));
  return drafts;
}

export function buildDraftSourceFromIdea(idea: Pick<Idea, "source" | "rawContent" | "normalizedContent">) {
  if (idea.source === IdeaSource.TELEGRAM || idea.source === IdeaSource.MANUAL) {
    return idea.rawContent;
  }

  return idea.normalizedContent ?? idea.rawContent;
}

function fallbackDraft(source: string, platform: DraftPlatform) {
  if (platform === DraftPlatform.X) {
    return [
      "Small but real progress today.",
      source,
      "That kind of practical improvement usually matters more than the flashy part.",
    ].join("\n\n");
  }

  return [
    "A pattern I keep noticing while building and advising startups:",
    source,
    "Clear systems and small practical improvements compound faster than people expect.",
  ].join("\n\n");
}

function buildDraftResult(
  platform: DraftPlatform,
  content: string,
  qualityScore: number,
  preferences: ResolvedGenerationPreferences,
) {
  return {
    platform,
    content,
    qualityScore,
    stylePreset: preferences.stylePresetId,
    formatPreset: preferences.formatPresetId,
    generationNote: preferences.generationNote,
  };
}
