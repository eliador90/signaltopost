export function scoreDraft(content: string, platform: "x" | "linkedin") {
  let score = 0.5;

  if (content.length > 60) score += 0.1;
  if (content.includes("\n")) score += 0.05;
  if (/(built|shipped|learned|founders|finance|product)/i.test(content)) score += 0.15;
  if (platform === "x" && content.length <= 280) score += 0.1;
  if (platform === "linkedin" && content.length <= 800) score += 0.1;

  return Math.min(score, 0.99);
}
