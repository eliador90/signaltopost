import { DraftPlatform } from "@prisma/client";
import { generateText } from "@/services/ai/client";
import { buildLinkedInDraftPrompt } from "@/services/ai/prompts/draft_linkedin";
import { buildXDraftPrompt } from "@/services/ai/prompts/draft_x";
import { scoreDraft } from "@/services/ai/scoreDraft";

export async function generateDraftPair(source: string) {
  const [xDraft, linkedInDraft] = await Promise.all([
    generatePlatformDraft(DraftPlatform.X, source),
    generatePlatformDraft(DraftPlatform.LINKEDIN, source),
  ]);

  return [xDraft, linkedInDraft];
}

export async function generatePlatformDraft(platform: DraftPlatform, source: string) {
  const prompt =
    platform === DraftPlatform.X
      ? buildXDraftPrompt(source)
      : buildLinkedInDraftPrompt(source);

  const generated = await generateText(prompt);
  const content = generated || fallbackDraft(source, platform);
  const qualityScore = scoreDraft(content, platform === DraftPlatform.X ? "x" : "linkedin");

  return { platform, content, qualityScore };
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
