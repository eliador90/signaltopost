import { DraftPlatform } from "@prisma/client";

type ManualFallbackInput = {
  content: string;
  platform: DraftPlatform;
};

export function buildManualPostingInstructions({ content, platform }: ManualFallbackInput) {
  const label = platform === DraftPlatform.X ? "X" : "LinkedIn";
  const composeLink =
    platform === DraftPlatform.X
      ? buildXComposeLink(content)
      : "Open LinkedIn and paste the content manually.";

  return [`Manual publish fallback for ${label}:`, "", content, "", composeLink].join("\n");
}

function buildXComposeLink(content: string) {
  return `Compose on X: https://twitter.com/intent/tweet?text=${encodeURIComponent(content)}`;
}
