import { NextRequest, NextResponse } from "next/server";
import { runPublishScheduledJob } from "@/jobs/publishScheduled";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  try {
    const result = await runPublishScheduledJob();
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected publish cron error";

    logger.error("Publish cron route failed", {
      error,
    });

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 },
    );
  }
}

function isAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  return !secret || request.headers.get("authorization") === `Bearer ${secret}`;
}
