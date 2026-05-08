import OpenAI from "openai";
import type { Responses } from "openai/resources/responses/responses";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { resolveAiModel } from "@/services/ai/models";

let cachedClient: OpenAI | null = null;

type GenerateOptions = {
  maxOutputTokens?: number;
  temperature?: number;
  reasoningEffort?: "low" | "medium" | "high";
};

type GenerateJsonOptions<T> = GenerateOptions & {
  schemaName: string;
  schema: Record<string, unknown>;
  validate?: (value: unknown) => T | null;
};

function getClient() {
  if (!env.OPENAI_API_KEY) {
    return null;
  }

  cachedClient ??= new OpenAI({ apiKey: env.OPENAI_API_KEY });
  return cachedClient;
}

export async function generateText(prompt: string, model?: string | null, options: GenerateOptions = {}) {
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
      max_output_tokens: options.maxOutputTokens,
      reasoning: options.reasoningEffort ? { effort: options.reasoningEffort } : undefined,
      temperature: options.temperature,
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

export async function generateJson<T>(
  prompt: string,
  model: string | null | undefined,
  options: GenerateJsonOptions<T>,
) {
  const client = getClient();
  const resolvedModel = resolveAiModel(model);

  if (!client) {
    logger.warn("OPENAI_API_KEY missing, structured generation unavailable");
    return null;
  }

  try {
    const response = await client.responses.create({
      model: resolvedModel,
      input: prompt,
      max_output_tokens: options.maxOutputTokens,
      reasoning: options.reasoningEffort ? { effort: options.reasoningEffort } : undefined,
      temperature: options.temperature,
      text: {
        format: {
          type: "json_schema",
          name: options.schemaName,
          schema: options.schema,
          strict: true,
        },
      },
    } satisfies Responses.ResponseCreateParamsNonStreaming);

    const parsed = JSON.parse(response.output_text) as unknown;
    return options.validate ? options.validate(parsed) : (parsed as T);
  } catch (error) {
    logger.warn("OpenAI structured request failed", {
      error,
      model: resolvedModel,
      schemaName: options.schemaName,
    });
    return null;
  }
}
