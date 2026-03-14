import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    ok: true,
    message: "GitHub webhook ingestion starts in Phase 2.",
  });
}
