export function scoreDraft(content: string, platform: "x" | "linkedin") {
  let score = 0.5;
  const lineCount = content.split("\n").filter((line) => line.trim()).length;
  const hasNumbers = /\d/.test(content);
  const hasBuzzwords = /(synergy|leverage|disrupt|revolutionary|game[- ]changer)/i.test(content);
  const exclamationCount = (content.match(/!/g) ?? []).length;
  const dashCount = (content.match(/[—-]/g) ?? []).length;

  if (content.length > 60) score += 0.1;
  if (content.includes("\n")) score += 0.05;
  if (/(built|shipped|learned|founders|finance|product)/i.test(content)) score += 0.15;
  if (hasNumbers) score += 0.05;
  if (platform === "x" && lineCount <= 4) score += 0.05;
  if (platform === "linkedin" && lineCount >= 3 && lineCount <= 8) score += 0.05;
  if (platform === "x" && content.length <= 280) score += 0.1;
  if (platform === "linkedin" && content.length <= 800) score += 0.1;
  if (hasBuzzwords) score -= 0.15;
  if (exclamationCount > 1) score -= 0.05;
  if (dashCount > 2) score -= 0.05;

  return Math.max(0.1, Math.min(score, 0.99));
}
