import { env } from "@/lib/env";

const telegramBaseUrl = env.TELEGRAM_BOT_TOKEN
  ? `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}`
  : null;

async function telegramRequest(method: string, payload: Record<string, unknown>) {
  if (!telegramBaseUrl) {
    return;
  }

  await fetch(`${telegramBaseUrl}/${method}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function sendTelegramMessage(
  chatId: string,
  text: string,
  replyMarkup?: Record<string, unknown>,
) {
  await telegramRequest("sendMessage", {
    chat_id: chatId,
    text,
    reply_markup: replyMarkup,
  });
}

export async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  await telegramRequest("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text,
  });
}
