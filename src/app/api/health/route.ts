import { NextResponse } from "next/server";
import { checkDatabaseHealth } from "@/lib/db";
import { env } from "@/lib/env";
import { initLocalScheduler } from "@/lib/localScheduler";

export const runtime = "nodejs";

initLocalScheduler();

export async function GET() {
  const database = await checkDatabaseHealth();
  const ok = database.ok;

  return NextResponse.json(
    {
      ok,
      service: "signaltopost",
      phase: 4,
      environment: env.NODE_ENV,
      appUrl: env.APP_URL,
      timezone: env.TIMEZONE,
      database,
      localScheduler: {
        enabled: env.ENABLE_LOCAL_SCHEDULER && env.NODE_ENV === "development",
        intervalSeconds: env.ENABLE_LOCAL_SCHEDULER ? env.LOCAL_PUBLISH_POLL_SECONDS : null,
      },
    },
    {
      status: ok ? 200 : 503,
    },
  );
}
