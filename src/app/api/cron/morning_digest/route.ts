import { NextRequest, NextResponse } from "next/server";
import { runMorningDigestJob } from "@/jobs/sendMorningDigest";
import { isAuthorizedCronRequest } from "@/lib/cronAuth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const result = await runMorningDigestJob();
  return NextResponse.json({ ok: true, result });
}
