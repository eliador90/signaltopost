import { NextResponse } from "next/server";
import { initLocalScheduler } from "@/lib/localScheduler";

initLocalScheduler();

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "signaltopost",
    phase: 3,
  });
}
