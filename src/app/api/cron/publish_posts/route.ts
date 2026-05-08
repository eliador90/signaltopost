import { NextRequest, NextResponse } from "next/server";
import { runPublishScheduledJob } from "@/jobs/publishScheduled";
import { isAuthorizedCronRequest } from "@/lib/cronAuth";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
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
