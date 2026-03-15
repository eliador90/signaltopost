import type { Draft } from "@prisma/client";
import { buildManualPostingInstructions } from "@/services/posts/fallback";

export async function publishToLinkedIn(draft: Draft) {
  return {
    status: "manual_fallback" as const,
    instructions: buildManualPostingInstructions({
      content: draft.content,
      platform: draft.platform,
    }),
  };
}
