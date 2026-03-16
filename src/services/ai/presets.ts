import { DraftPlatform, type User } from "@prisma/client";

export type StylePresetId = "default" | "builder_punchy" | "calm_operator" | "cfo_authority";
export type FormatPresetId = "standard" | "two_sentence" | "short_paragraphs" | "bullet_points";

type StylePreset = {
  id: StylePresetId;
  label: string;
  description: string;
  instruction: string;
};

type FormatPreset = {
  id: FormatPresetId;
  label: string;
  description: string;
  instruction: string;
};

export const stylePresets: StylePreset[] = [
  {
    id: "default",
    label: "Default",
    description: "Balanced, practical, and close to the base SignalToPost voice.",
    instruction:
      "Keep the tone practical, concise, direct, and useful. Do not force a strong angle if the idea does not support one.",
  },
  {
    id: "builder_punchy",
    label: "Builder punchy",
    description: "Shorter, sharper framing with stronger hooks and clearer contrast.",
    instruction:
      "Use a punchier builder voice. Favor a sharper first line, tighter phrasing, stronger contrast, and fewer soft qualifiers.",
  },
  {
    id: "calm_operator",
    label: "Calm operator",
    description: "Measured, thoughtful, and confident without sounding cold or generic.",
    instruction:
      "Use a calm operator voice. Keep it measured, thoughtful, and confident. Avoid aggressive framing and avoid hype.",
  },
  {
    id: "cfo_authority",
    label: "CFO authority",
    description: "Clearer credibility and stronger finance/operator perspective.",
    instruction:
      "Lean more into the founder-finance and operator perspective. Sound credible, clear, and experienced without becoming corporate.",
  },
];

export const formatPresets: FormatPreset[] = [
  {
    id: "standard",
    label: "Standard",
    description: "Default platform-appropriate structure.",
    instruction: "Use the most natural structure for the platform. Do not force a special layout.",
  },
  {
    id: "two_sentence",
    label: "Two sentences",
    description: "Keep the output to exactly two sentences when possible.",
    instruction: "Write exactly two sentences unless the source itself makes that impossible.",
  },
  {
    id: "short_paragraphs",
    label: "Short paragraphs",
    description: "Short, easy-to-scan paragraphs with clean spacing.",
    instruction: "Use short paragraphs with clear spacing. Keep each paragraph compact and easy to scan.",
  },
  {
    id: "bullet_points",
    label: "Bullet points",
    description: "List format for frameworks, steps, or takeaways.",
    instruction:
      "Use a compact bullet-point structure if it fits the idea. Keep the bullets short and practical, not decorative.",
  },
];

export type GenerationPreferenceOverrides = {
  stylePresetId?: string | null;
  formatPresetId?: string | null;
  generationNote?: string | null;
};

export type ResolvedGenerationPreferences = {
  stylePresetId: StylePresetId;
  formatPresetId: FormatPresetId;
  generationNote: string | null;
  styleInstruction: string;
  formatInstruction: string;
  styleLabel: string;
  formatLabel: string;
};

export function getStylePreset(id?: string | null) {
  return stylePresets.find((preset) => preset.id === id) ?? stylePresets[0];
}

export function getFormatPreset(id?: string | null) {
  return formatPresets.find((preset) => preset.id === id) ?? formatPresets[0];
}

export function resolveGenerationPreferences(
  platform: DraftPlatform,
  user?: Pick<
    User,
    "defaultXStylePreset" | "defaultXFormatPreset" | "defaultLinkedInStylePreset" | "defaultLinkedInFormatPreset"
  > | null,
  overrides?: GenerationPreferenceOverrides,
): ResolvedGenerationPreferences {
  const stylePresetId =
    overrides?.stylePresetId ??
    (platform === DraftPlatform.X ? user?.defaultXStylePreset : user?.defaultLinkedInStylePreset) ??
    "default";
  const formatPresetId =
    overrides?.formatPresetId ??
    (platform === DraftPlatform.X ? user?.defaultXFormatPreset : user?.defaultLinkedInFormatPreset) ??
    "standard";

  const stylePreset = getStylePreset(stylePresetId);
  const formatPreset = getFormatPreset(formatPresetId);
  const generationNote = overrides?.generationNote?.trim() || null;

  return {
    stylePresetId: stylePreset.id,
    formatPresetId: formatPreset.id,
    generationNote,
    styleInstruction: stylePreset.instruction,
    formatInstruction: formatPreset.instruction,
    styleLabel: stylePreset.label,
    formatLabel: formatPreset.label,
  };
}
