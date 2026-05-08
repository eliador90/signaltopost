import { timingSafeEqual } from "node:crypto";
import { headers } from "next/headers";
import { env } from "@/lib/env";

export function isDashboardAuthConfigured() {
  return Boolean(env.DASHBOARD_SECRET?.trim());
}

export function canBypassDashboardAuthInDevelopment() {
  return env.NODE_ENV !== "production" && !isDashboardAuthConfigured();
}

export function isValidDashboardAuthorizationHeader(authorization: string | null) {
  if (canBypassDashboardAuthInDevelopment()) {
    return true;
  }

  const secret = env.DASHBOARD_SECRET?.trim();
  if (!secret || !authorization?.startsWith("Basic ")) {
    return false;
  }

  const encoded = authorization.slice("Basic ".length);
  let decoded = "";
  try {
    decoded = Buffer.from(encoded, "base64").toString("utf8");
  } catch {
    return false;
  }

  const password = decoded.includes(":") ? decoded.slice(decoded.indexOf(":") + 1) : decoded;
  return timingSafeStringEqual(password, secret);
}

export async function requireDashboardAuth() {
  const requestHeaders = await headers();
  if (!isValidDashboardAuthorizationHeader(requestHeaders.get("authorization"))) {
    throw new Error("Unauthorized dashboard action");
  }
}

function timingSafeStringEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}
