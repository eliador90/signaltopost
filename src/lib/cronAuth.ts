import type { NextRequest } from "next/server";
import { logger } from "@/lib/logger";

export function isAuthorizedCronRequest(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    logger.error("Rejected cron request because CRON_SECRET is not configured");
    return false;
  }

  return request.headers.get("authorization") === `Bearer ${secret}`;
}
