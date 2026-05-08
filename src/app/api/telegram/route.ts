import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { initLocalScheduler } from "@/lib/localScheduler";
import { handleTelegramUpdate } from "@/services/telegram/handlers";
import type { TelegramUpdate } from "@/types/telegram";

export const runtime = "nodejs";

initLocalScheduler();

export async function POST(request: NextRequest) {
  const secret = env.TELEGRAM_WEBHOOK_SECRET?.trim();
  const headerSecret = request.headers.get("x-telegram-bot-api-secret-token");

  if (!secret && env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "webhook_secret_not_configured" }, { status: 503 });
  }

  if (secret && headerSecret !== secret) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  await handleTelegramUpdate(payload as TelegramUpdate);

  return NextResponse.json({ ok: true });
}
