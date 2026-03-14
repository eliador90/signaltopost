import OpenAI from "openai";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

let cachedClient: OpenAI | null = null;

function getClient() {
  if (!env.OPENAI_API_KEY) {
    return null;
  }

  cachedClient ??= new OpenAI({ apiKey: env.OPENAI_API_KEY });
  return cachedClient;
}

export async function generateText(prompt: string) {
  const client = getClient();

  if (!client) {
    logger.warn("OPENAI_API_KEY missing, using fallback generation");
    return null;
  }

  const response = await client.responses.create({
    model: env.OPENAI_MODEL,
    input: prompt,
  });

  return response.output_text.trim();
}
