import { env } from "@/lib/env";

const defaultContentProfile = {
  context: "You are writing for one founder-operator based in Zurich.",
  themes: [
    "Fractional CFO for startups",
    "Startup finance systems, reporting, budgeting, fundraising readiness",
    "Building tools with AI",
    "Shipping personal software projects in public",
    "Practical lessons from startup operations and solo building",
  ],
  voiceRules: [
    "Practical",
    "Concise",
    "Direct",
    "Thoughtful",
    "Honest, not hypey",
    "Useful, not generic",
    "Prefer plain punctuation over stylistic dashes",
  ],
  avoidRules: [
    "Corporate buzzwords",
    "Empty inspiration",
    "Founder cringe",
    "Robotic AI phrasing",
    "Excessive self-congratulation",
    "Em dashes and hyphen-heavy phrasing unless truly necessary",
  ],
};

export const userContext = buildUserContext();

function buildUserContext() {
  const context = env.CONTENT_PROFILE_CONTEXT?.trim() || defaultContentProfile.context;
  const themes = envList(env.CONTENT_PROFILE_THEMES, defaultContentProfile.themes);
  const voiceRules = envList(env.CONTENT_PROFILE_VOICE_RULES, defaultContentProfile.voiceRules);
  const avoidRules = envList(env.CONTENT_PROFILE_AVOID_RULES, defaultContentProfile.avoidRules);

  return [
    context,
    "",
    "Main themes:",
    ...themes.map((theme) => `- ${theme}`),
    "",
    "Voice rules:",
    ...voiceRules.map((rule) => `- ${rule}`),
    "",
    "Avoid:",
    ...avoidRules.map((rule) => `- ${rule}`),
  ].join("\n");
}

export function postStyleGuide(platform: "x" | "linkedin") {
  if (platform === "x") {
    return [
      `
Write for X:
- Short and punchy
- Strong first line
- Easy to scan
- Focus on one sharp point if possible
- Prefer concrete progress and useful lessons
- Avoid em dashes and avoid using hyphens as a stylistic crutch
`.trim(),
      env.CONTENT_PROFILE_X_GUIDANCE?.trim(),
    ]
      .filter(Boolean)
      .join("\n");
  }

  return [
    `
Write for LinkedIn:
- More structured but still concise
- Useful to founders and operators
- Builds credibility for fractional CFO work
- Can include a soft CTA if natural
- Prefer practical framing over personal hype
- Avoid em dashes and avoid using hyphens as a stylistic crutch
`.trim(),
    env.CONTENT_PROFILE_LINKEDIN_GUIDANCE?.trim(),
  ]
    .filter(Boolean)
    .join("\n");
}

function envList(value: string | undefined, fallback: string[]) {
  if (!value?.trim()) {
    return fallback;
  }

  return value
    .split(/\r?\n|;/)
    .map((item) => item.trim().replace(/^-+\s*/, ""))
    .filter(Boolean);
}
