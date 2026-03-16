import type { Draft } from "@prisma/client";
import { buildManualPostingPayload } from "@/services/posts/fallback";

export async function publishToLinkedIn(draft: Draft) {
  const fallback = buildManualPostingPayload({
    content: draft.content,
    platform: draft.platform,
  });

  return {
    status: "manual_fallback" as const,
    ...fallback,
  };
}
