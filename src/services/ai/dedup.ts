type DraftLike = {
  id?: string;
  content: string;
  platform?: string;
};

export function normalizeDraftText(content: string) {
  return content
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenizeDraft(content: string) {
  return new Set(normalizeDraftText(content).split(" ").filter((token) => token.length > 2));
}

export function calculateSimilarity(a: string, b: string) {
  const tokensA = tokenizeDraft(a);
  const tokensB = tokenizeDraft(b);

  if (tokensA.size === 0 || tokensB.size === 0) {
    return 0;
  }

  let overlap = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) {
      overlap += 1;
    }
  }

  return overlap / Math.max(tokensA.size, tokensB.size);
}

export function isNearDuplicateDraft(content: string, existingDrafts: DraftLike[], threshold = 0.8) {
  return existingDrafts.some((draft) => calculateSimilarity(content, draft.content) >= threshold);
}
