import { formatPresets, getFormatPreset, getStylePreset, stylePresets } from "@/services/ai/presets";

export function ideaPlatformKeyboard(ideaId: string) {
  return {
    inline_keyboard: [
      [
        { text: "Draft for X", callback_data: `idea:platform_x:${ideaId}` },
        { text: "Draft for LinkedIn", callback_data: `idea:platform_linkedin:${ideaId}` },
      ],
      [{ text: "Draft for Both", callback_data: `idea:platform_both:${ideaId}` }],
    ],
  };
}

export function stylePresetKeyboard(ideaId: string) {
  return {
    inline_keyboard: [
      ...stylePresets.map((preset) => [
        { text: `${preset.label} - ${preset.description}`, callback_data: `idea:style_${preset.id}:${ideaId}` },
      ]),
      [{ text: "Back to platform", callback_data: `idea:back_to_platform:${ideaId}` }],
    ],
  };
}

export function formatPresetKeyboard(ideaId: string) {
  return {
    inline_keyboard: [
      ...formatPresets.map((preset) => [
        { text: `${preset.label} - ${preset.description}`, callback_data: `idea:format_${preset.id}:${ideaId}` },
      ]),
      [{ text: "Back to style", callback_data: `idea:back_to_style:${ideaId}` }],
    ],
  };
}

export function generationSummaryKeyboard(ideaId: string) {
  return {
    inline_keyboard: [
      [{ text: "Generate now", callback_data: `idea:generate:${ideaId}` }],
      [
        { text: "Add note", callback_data: `idea:add_note:${ideaId}` },
        { text: "Use as default", callback_data: `idea:use_defaults:${ideaId}` },
      ],
      [{ text: "Back to format", callback_data: `idea:back_to_format:${ideaId}` }],
    ],
  };
}

export function draftKeyboard(draftId: string) {
  return {
    inline_keyboard: [
      [
        { text: "Approve", callback_data: `draft:approve:${draftId}` },
        { text: "Reject", callback_data: `draft:reject:${draftId}` },
      ],
      [
        { text: "Post now", callback_data: `draft:post_now:${draftId}` },
        { text: "Schedule", callback_data: `draft:schedule_options:${draftId}` },
      ],
      [
        { text: "Rewrite shorter", callback_data: `draft:rewrite_shorter:${draftId}` },
        { text: "Rewrite sharper", callback_data: `draft:rewrite_sharper:${draftId}` },
      ],
      [
        { text: "Rewrite calmer", callback_data: `draft:rewrite_calmer:${draftId}` },
        { text: "Rewrite with hook", callback_data: `draft:rewrite_hook:${draftId}` },
      ],
      [
        { text: "Rewrite more like me", callback_data: `draft:rewrite_personal:${draftId}` },
      ],
    ],
  };
}

export function scheduleKeyboard(draftId: string) {
  return {
    inline_keyboard: [
      [
        { text: "Tomorrow 09:00", callback_data: `draft:schedule_tomorrow_0900:${draftId}` },
        { text: "Tomorrow 14:00", callback_data: `draft:schedule_tomorrow_1400:${draftId}` },
      ],
      [{ text: "Type a time", callback_data: `draft:schedule_custom:${draftId}` }],
      [{ text: "Back to actions", callback_data: `draft:show_actions:${draftId}` }],
    ],
  };
}

export function draftPreferenceLine(stylePreset?: string | null, formatPreset?: string | null) {
  const styleLabel = getStylePreset(stylePreset).label;
  const formatLabel = getFormatPreset(formatPreset).label;
  return `Style: ${styleLabel} | Format: ${formatLabel}`;
}
