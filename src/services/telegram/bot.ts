import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

const telegramBaseUrl = env.TELEGRAM_BOT_TOKEN
  ? `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}`
  : null;

async function telegramRequest(method: string, payload: Record<string, unknown>) {
  if (!telegramBaseUrl) {
    logger.warn("Skipped Telegram API call because TELEGRAM_BOT_TOKEN is not configured", {
      method,
    });
    return;
  }

  const response = await fetch(`${telegramBaseUrl}/${method}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  let responseBody: unknown = null;
  try {
    responseBody = await response.json();
  } catch {
    responseBody = null;
  }

  if (!response.ok) {
    logger.error("Telegram API request failed", {
      method,
      status: response.status,
      payload: redactTelegramPayload(payload),
      responseBody,
    });

    throw new Error(`Telegram API ${method} failed with status ${response.status}`);
  }

  if (
    responseBody &&
    typeof responseBody === "object" &&
    "ok" in responseBody &&
    (responseBody as { ok?: boolean }).ok === false
  ) {
    logger.error("Telegram API returned ok=false", {
      method,
      payload: redactTelegramPayload(payload),
      responseBody,
    });

    throw new Error(`Telegram API ${method} returned ok=false`);
  }
}

function redactTelegramPayload(payload: Record<string, unknown>) {
  return {
    ...payload,
    chat_id: payload.chat_id ? "[redacted]" : undefined,
    text: typeof payload.text === "string" ? `[redacted:${payload.text.length}]` : undefined,
    reply_markup: payload.reply_markup ? "[redacted]" : undefined,
  };
}

export async function sendTelegramMessage(
  chatId: string,
  text: string,
  replyMarkup?: Record<string, unknown>,
  options?: {
    parseMode?: "HTML" | "MarkdownV2";
    disableWebPagePreview?: boolean;
  },
) {
  await telegramRequest("sendMessage", {
    chat_id: chatId,
    text,
    reply_markup: replyMarkup,
    parse_mode: options?.parseMode,
    disable_web_page_preview: options?.disableWebPagePreview,
  });
}

export async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  await telegramRequest("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text,
  });
}
