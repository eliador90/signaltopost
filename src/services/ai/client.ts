import OpenAI from "openai";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { resolveAiModel } from "@/services/ai/models";

let cachedClient: OpenAI | null = null;

function getClient() {
  if (!env.OPENAI_API_KEY) {
    return null;
  }

  cachedClient ??= new OpenAI({ apiKey: env.OPENAI_API_KEY });
  return cachedClient;
}

export async function generateText(prompt: string, model?: string | null) {
  const client = getClient();
  const resolvedModel = resolveAiModel(model);

  if (!client) {
    logger.warn("OPENAI_API_KEY missing, using fallback generation");
    return null;
  }

  try {
    const response = await client.responses.create({
      model: resolvedModel,
      input: prompt,
    });

    return response.output_text.trim();
  } catch (error) {
    logger.warn("OpenAI request failed, using fallback generation", {
      error,
      model: resolvedModel,
    });
    return null;
  }
}
