import { createHmac, randomUUID } from "node:crypto";
import type { Draft } from "@prisma/client";
import { env } from "@/lib/env";
import { buildManualPostingPayload } from "@/services/posts/fallback";

const xApiUrl = "https://api.twitter.com/2/tweets";

export async function publishToX(draft: Draft) {
  if (!hasXCredentials()) {
    const fallback = buildManualPostingPayload({
      content: draft.content,
      platform: draft.platform,
    });
    return {
      status: "manual_fallback" as const,
      ...fallback,
    };
  }

  const body = JSON.stringify({ text: draft.content });
  const authHeader = buildOauthHeader("POST", xApiUrl, {});

  const response = await fetch(xApiUrl, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "content-type": "application/json",
    },
    body,
  });

  if (!response.ok) {
    const errorText = await response.text();
    return {
      status: "failed" as const,
      error: `X publish failed: ${response.status} ${response.statusText} ${errorText}`,
    };
  }

  const payload = (await response.json()) as { data?: { id?: string } };
  return {
    status: "posted" as const,
    externalPostId: payload.data?.id ?? null,
  };
}

function hasXCredentials() {
  return Boolean(
    env.X_API_KEY &&
      env.X_API_KEY_SECRET &&
      env.X_ACCESS_TOKEN &&
      env.X_ACCESS_TOKEN_SECRET,
  );
}

function buildOauthHeader(method: string, url: string, queryParams: Record<string, string>) {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: env.X_API_KEY ?? "",
    oauth_nonce: randomUUID().replaceAll("-", ""),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: env.X_ACCESS_TOKEN ?? "",
    oauth_version: "1.0",
  };

  const signature = signOauthRequest(method, url, queryParams, oauthParams);
  const headerParams = {
    ...oauthParams,
    oauth_signature: signature,
  };

  const headerValue = Object.entries(headerParams)
    .map(([key, value]) => `${percentEncode(key)}="${percentEncode(value)}"`)
    .join(", ");

  return `OAuth ${headerValue}`;
}

function signOauthRequest(
  method: string,
  url: string,
  queryParams: Record<string, string>,
  oauthParams: Record<string, string>,
) {
  const allParams = { ...queryParams, ...oauthParams };
  const normalized = Object.keys(allParams)
    .sort()
    .map((key) => `${percentEncode(key)}=${percentEncode(allParams[key] ?? "")}`)
    .join("&");

  const baseString = [method.toUpperCase(), percentEncode(url), percentEncode(normalized)].join("&");
  const signingKey = `${percentEncode(env.X_API_KEY_SECRET ?? "")}&${percentEncode(
    env.X_ACCESS_TOKEN_SECRET ?? "",
  )}`;

  return createHmac("sha1", signingKey).update(baseString).digest("base64");
}

function percentEncode(value: string) {
  return encodeURIComponent(value)
    .replaceAll("!", "%21")
    .replaceAll("*", "%2A")
    .replaceAll("'", "%27")
    .replaceAll("(", "%28")
    .replaceAll(")", "%29");
}
