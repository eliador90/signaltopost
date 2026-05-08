import { IdeaSource, DraftPlatform, type Idea, type User } from "@prisma/client";
import { z } from "zod";
import { generateJson, generateText } from "@/services/ai/client";
import { DraftGenerationError } from "@/services/ai/errors";
import {
  resolveGenerationPreferences,
  type GenerationPreferenceOverrides,
  type ResolvedGenerationPreferences,
} from "@/services/ai/presets";
import { buildLinkedInDraftPrompt } from "@/services/ai/prompts/draft_linkedin";
import { buildRepairDraftPrompt } from "@/services/ai/prompts/repair_draft";
import { buildXDraftPrompt } from "@/services/ai/prompts/draft_x";
import { evaluateDraft } from "@/services/ai/scoreDraft";
import { buildTasteInstruction, buildTasteProfile } from "@/services/ai/taste";
import { repairDraftLocally, sanitizeDraftContent, validateDraftContent } from "@/services/ai/validateDraft";

type GenerationContext = {
  user?: Pick<
    User,
    | "id"
    | "defaultXStylePreset"
    | "defaultXFormatPreset"
    | "defaultLinkedInStylePreset"
    | "defaultLinkedInFormatPreset"
    | "openAiModel"
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
  const taste = context?.user?.id ? await buildTasteProfile(context.user.id, platform) : null;
  const tasteInstruction = buildTasteInstruction(taste);
  const prompt =
    platform === DraftPlatform.X
      ? buildXDraftPrompt(source, resolvedPreferences, tasteInstruction)
      : buildLinkedInDraftPrompt(source, resolvedPreferences, tasteInstruction);

  const generated = await generateDraftCandidates(prompt, context?.user?.openAiModel);
  if (!generated || generated.candidates.length === 0) {
    throw new DraftGenerationError("OpenAI draft generation was unavailable. No fallback draft was stored.");
  }

  const selected = selectBestCandidate(generated.candidates, platform, taste ?? undefined);
  const repaired = await repairIfNeeded(selected.content, platform, context?.user?.openAiModel);
  const quality = evaluateDraft(repaired, platform, taste ?? undefined);

  return buildDraftResult(platform, repaired, quality.score, resolvedPreferences);
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

const draftCandidateSchema = z.object({
  brief: z.object({
    angle: z.string(),
    audience: z.string(),
    proof: z.string(),
    risk: z.string(),
  }),
  candidates: z
    .array(
      z.object({
        content: z.string(),
        rationale: z.string(),
      }),
    )
    .min(1)
    .max(3),
});

type DraftCandidateResponse = z.infer<typeof draftCandidateSchema>;

const draftCandidateJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["brief", "candidates"],
  properties: {
    brief: {
      type: "object",
      additionalProperties: false,
      required: ["angle", "audience", "proof", "risk"],
      properties: {
        angle: { type: "string" },
        audience: { type: "string" },
        proof: { type: "string" },
        risk: { type: "string" },
      },
    },
    candidates: {
      type: "array",
      minItems: 1,
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["content", "rationale"],
        properties: {
          content: { type: "string" },
          rationale: { type: "string" },
        },
      },
    },
  },
};

async function generateDraftCandidates(prompt: string, model?: string | null) {
  return generateJson<DraftCandidateResponse>(prompt, model, {
    schemaName: "social_post_candidates",
    schema: draftCandidateJsonSchema,
    maxOutputTokens: 1800,
    reasoningEffort: "medium",
    validate: (value) => {
      const parsed = draftCandidateSchema.safeParse(value);
      return parsed.success ? parsed.data : null;
    },
  });
}

function selectBestCandidate(
  candidates: Array<{ content: string; rationale: string }>,
  platform: DraftPlatform,
  taste: Parameters<typeof evaluateDraft>[2],
) {
  return candidates
    .map((candidate) => ({
      content: sanitizeDraftContent(candidate.content),
      score: evaluateDraft(candidate.content, platform, taste).score,
    }))
    .sort((left, right) => right.score - left.score)[0];
}

async function repairIfNeeded(content: string, platform: DraftPlatform, model?: string | null) {
  const validation = validateDraftContent(content, platform);
  if (validation.valid && validation.warnings.length <= 1) {
    return sanitizeDraftContent(content);
  }

  const repaired = await generateText(
    buildRepairDraftPrompt(content, platform, [...validation.hardErrors, ...validation.warnings]),
    model,
    {
      maxOutputTokens: platform === DraftPlatform.X ? 250 : 900,
      reasoningEffort: "low",
    },
  );

  const repairedContent = repaired ? sanitizeDraftContent(repaired) : repairDraftLocally(content, platform);
  const repairedValidation = validateDraftContent(repairedContent, platform);

  if (repairedValidation.valid) {
    return repairedContent;
  }

  return repairDraftLocally(repairedContent, platform);
}
