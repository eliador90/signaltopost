import { env } from "@/lib/env";

export const aiModelOptions = [
  { id: "gpt-5.4", label: "GPT-5.4", description: "Default quality-focused model" },
  { id: "gpt-5.4-mini", label: "GPT-5.4 Mini", description: "Lower-cost option for lighter drafts" },
  { id: "gpt-5.5", label: "GPT-5.5", description: "Higher-capability option when available" },
  { id: "gpt-5.2", label: "GPT-5.2", description: "Conservative fallback option" },
];

export function resolveAiModel(model?: string | null) {
  return model?.trim() || env.OPENAI_MODEL;
}
