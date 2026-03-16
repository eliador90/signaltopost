import { NextRequest, NextResponse } from "next/server";
import { initLocalScheduler } from "@/lib/localScheduler";
import { handleTelegramUpdate } from "@/services/telegram/handlers";

export const runtime = "nodejs";

initLocalScheduler();

export async function POST(request: NextRequest) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const headerSecret = request.headers.get("x-telegram-bot-api-secret-token");

  if (secret && headerSecret !== secret) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const payload = await request.json();
  await handleTelegramUpdate(payload);

  return NextResponse.json({ ok: true });
}
