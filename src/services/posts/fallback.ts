import { DraftPlatform } from "@prisma/client";

type ManualFallbackInput = {
  content: string;
  platform: DraftPlatform;
};

type ManualFallbackPayload = {
  summary: string;
  postBody: string;
};

export function buildManualPostingPayload({ content, platform }: ManualFallbackInput): ManualFallbackPayload {
  if (platform === DraftPlatform.X) {
    return {
      summary: [
        "X direct posting is unavailable, so this draft is ready for manual posting.",
        "",
        `Compose on X: ${buildXComposeLink(content)}`,
        "",
        "The next message contains the final post text only so it is easy to copy.",
      ].join("\n"),
      postBody: content,
    };
  }

  return {
    summary: [
      "LinkedIn direct posting is not enabled, so this draft is ready for manual publishing.",
      "",
      "Next:",
      "1. Open LinkedIn",
      "2. Start a new post",
      "3. Paste the next message",
      "4. Publish manually",
    ].join("\n"),
    postBody: ["LinkedIn post body", "", content].join("\n"),
  };
}

function buildXComposeLink(content: string) {
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(content)}`;
}
