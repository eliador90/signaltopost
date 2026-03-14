export const userContext = `
You are writing for one founder-operator based in Zurich.
Main themes:
- Fractional CFO for startups
- Startup finance systems, reporting, budgeting, fundraising readiness
- Building tools with AI
- Shipping personal software projects in public
- Practical lessons from startup operations and solo building

Voice rules:
- Practical
- Concise
- Direct
- Thoughtful
- Honest, not hypey
- Useful, not generic

Avoid:
- Corporate buzzwords
- Empty inspiration
- Founder cringe
- Robotic AI phrasing
- Excessive self-congratulation
`.trim();

export function postStyleGuide(platform: "x" | "linkedin") {
  if (platform === "x") {
    return `
Write for X:
- Short and punchy
- Strong first line
- Easy to scan
- Focus on one sharp point if possible
- Prefer concrete progress and useful lessons
`.trim();
  }

  return `
Write for LinkedIn:
- More structured but still concise
- Useful to founders and operators
- Builds credibility for fractional CFO work
- Can include a soft CTA if natural
- Prefer practical framing over personal hype
`.trim();
}
