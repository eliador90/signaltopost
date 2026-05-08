import { NextResponse } from "next/server";
import { checkDatabaseHealth } from "@/lib/db";
import { initLocalScheduler } from "@/lib/localScheduler";

export const runtime = "nodejs";

initLocalScheduler();

export async function GET() {
  const database = await checkDatabaseHealth();
  const ok = database.ok;

  return NextResponse.json(
    { ok },
    {
      status: ok ? 200 : 503,
    },
  );
}
