import { NextRequest, NextResponse } from "next/server";
import { runCleanupJob } from "@/jobs/cleanup";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const result = await runCleanupJob();
  return NextResponse.json({ ok: true, result });
}

function isAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  return !secret || request.headers.get("authorization") === `Bearer ${secret}`;
}
