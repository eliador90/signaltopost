import type { Draft } from "@prisma/client";
import { generateText } from "@/services/ai/client";
import { buildRewritePrompt } from "@/services/ai/prompts/rewrite";

type RewriteInput = Pick<Draft, "content" | "platform" | "stylePreset" | "formatPreset" | "generationNote">;

export async function rewriteDraft(draft: RewriteInput, direction: string) {
  const rewritten = await generateText(
    buildRewritePrompt(draft.content, direction, {
      platform: draft.platform,
      stylePreset: draft.stylePreset,
      formatPreset: draft.formatPreset,
      generationNote: draft.generationNote,
    }),
  );
  return rewritten || fallbackRewrite(draft.content, direction);
}

function fallbackRewrite(content: string, direction: string) {
  if (direction === "shorter") {
    return content.length > 220 ? `${content.slice(0, 217).trim()}...` : content;
  }

  if (direction === "sharper") {
    return `${content}\n\nClearer point: practical work beats performative work.`;
  }

  if (direction === "calmer") {
    return `${content}\n\nKeep the tone steady, practical, and low ego.`;
  }

  if (direction === "stronger hook") {
    const firstSentence = content.split("\n").find((line) => line.trim());
    if (!firstSentence) return content;
    return `Most people get this backward.\n\n${content}`;
  }

  if (direction === "more like me") {
    return `${content}\n\nTrying to keep the point practical and grounded.`;
  }

  return content;
}
