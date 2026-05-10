import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z
    .string()
    .min(1)
    .default("postgresql://postgres:postgres@localhost:5432/signaltopost?schema=public"),
  DIRECT_DATABASE_URL: z.string().optional(),
  TIMEZONE: z.string().default("Europe/Zurich"),
  CONTENT_PROFILE_CONTEXT: z.string().optional(),
  CONTENT_PROFILE_THEMES: z.string().optional(),
  CONTENT_PROFILE_VOICE_RULES: z.string().optional(),
  CONTENT_PROFILE_AVOID_RULES: z.string().optional(),
  CONTENT_PROFILE_X_GUIDANCE: z.string().optional(),
  CONTENT_PROFILE_LINKEDIN_GUIDANCE: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-5.4"),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_ALLOWED_CHAT_ID: z.string().optional(),
  TELEGRAM_WEBHOOK_SECRET: z.string().optional(),
  GITHUB_TOKEN: z.string().optional(),
  GITHUB_USERNAME: z.string().optional(),
  GITHUB_REPOS: z.string().optional(),
  GITHUB_WEBHOOK_SECRET: z.string().optional(),
  GITHUB_MAX_IDEAS_PER_DAY: z.coerce.number().int().positive().default(3),
  GITHUB_MAX_IDEAS_PER_REPO_PER_DAY: z.coerce.number().int().positive().default(2),
  X_API_KEY: z.string().optional(),
  X_API_KEY_SECRET: z.string().optional(),
  X_ACCESS_TOKEN: z.string().optional(),
  X_ACCESS_TOKEN_SECRET: z.string().optional(),
  X_BEARER_TOKEN: z.string().optional(),
  LINKEDIN_CLIENT_ID: z.string().optional(),
  LINKEDIN_CLIENT_SECRET: z.string().optional(),
  LINKEDIN_REDIRECT_URI: z.string().optional(),
  LINKEDIN_ACCESS_TOKEN: z.string().optional(),
  ENABLE_LOCAL_SCHEDULER: z.coerce.boolean().default(false),
  LOCAL_PUBLISH_POLL_SECONDS: z.coerce.number().int().positive().default(60),
  CRON_SECRET: z.string().optional(),
  DASHBOARD_SECRET: z.string().optional(),
});

export const env = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  APP_URL: process.env.APP_URL,
  DATABASE_URL: process.env.DATABASE_URL,
  DIRECT_DATABASE_URL: process.env.DIRECT_DATABASE_URL,
  TIMEZONE: process.env.TIMEZONE,
  CONTENT_PROFILE_CONTEXT: process.env.CONTENT_PROFILE_CONTEXT,
  CONTENT_PROFILE_THEMES: process.env.CONTENT_PROFILE_THEMES,
  CONTENT_PROFILE_VOICE_RULES: process.env.CONTENT_PROFILE_VOICE_RULES,
  CONTENT_PROFILE_AVOID_RULES: process.env.CONTENT_PROFILE_AVOID_RULES,
  CONTENT_PROFILE_X_GUIDANCE: process.env.CONTENT_PROFILE_X_GUIDANCE,
  CONTENT_PROFILE_LINKEDIN_GUIDANCE: process.env.CONTENT_PROFILE_LINKEDIN_GUIDANCE,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_MODEL: process.env.OPENAI_MODEL,
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  TELEGRAM_ALLOWED_CHAT_ID: process.env.TELEGRAM_ALLOWED_CHAT_ID,
  TELEGRAM_WEBHOOK_SECRET: process.env.TELEGRAM_WEBHOOK_SECRET,
  GITHUB_TOKEN: process.env.GITHUB_TOKEN,
  GITHUB_USERNAME: process.env.GITHUB_USERNAME,
  GITHUB_REPOS: process.env.GITHUB_REPOS,
  GITHUB_WEBHOOK_SECRET: process.env.GITHUB_WEBHOOK_SECRET,
  GITHUB_MAX_IDEAS_PER_DAY: process.env.GITHUB_MAX_IDEAS_PER_DAY,
  GITHUB_MAX_IDEAS_PER_REPO_PER_DAY: process.env.GITHUB_MAX_IDEAS_PER_REPO_PER_DAY,
  X_API_KEY: process.env.X_API_KEY,
  X_API_KEY_SECRET: process.env.X_API_KEY_SECRET,
  X_ACCESS_TOKEN: process.env.X_ACCESS_TOKEN,
  X_ACCESS_TOKEN_SECRET: process.env.X_ACCESS_TOKEN_SECRET,
  X_BEARER_TOKEN: process.env.X_BEARER_TOKEN,
  LINKEDIN_CLIENT_ID: process.env.LINKEDIN_CLIENT_ID,
  LINKEDIN_CLIENT_SECRET: process.env.LINKEDIN_CLIENT_SECRET,
  LINKEDIN_REDIRECT_URI: process.env.LINKEDIN_REDIRECT_URI,
  LINKEDIN_ACCESS_TOKEN: process.env.LINKEDIN_ACCESS_TOKEN,
  ENABLE_LOCAL_SCHEDULER: process.env.ENABLE_LOCAL_SCHEDULER,
  LOCAL_PUBLISH_POLL_SECONDS: process.env.LOCAL_PUBLISH_POLL_SECONDS,
  CRON_SECRET: process.env.CRON_SECRET,
  DASHBOARD_SECRET: process.env.DASHBOARD_SECRET,
});

export function getConfiguredGithubRepos() {
  return (env.GITHUB_REPOS ?? "")
    .split(",")
    .map((repo) => repo.trim())
    .filter(Boolean);
}

export function getGithubRepoApiPath(repoName: string) {
  if (repoName.includes("/")) {
    return repoName;
  }

  if (!env.GITHUB_USERNAME) {
    throw new Error("GITHUB_USERNAME is required when GITHUB_REPOS contains repo names without owners");
  }

  return `${env.GITHUB_USERNAME}/${repoName}`;
}

export function isConfiguredGithubRepo(repoName: string, fullName?: string | null) {
  const configuredRepos = getConfiguredGithubRepos();
  return configuredRepos.some((configuredRepo) => {
    if (configuredRepo === repoName || configuredRepo === fullName) {
      return true;
    }

    if (fullName) {
      return false;
    }

    return configuredRepo.includes("/") && configuredRepo.split("/").at(-1) === repoName;
  });
}

export function getConfiguredGithubRepoName(repoName: string, fullName?: string | null) {
  const configuredRepos = getConfiguredGithubRepos();
  const exactMatch = configuredRepos.find((configuredRepo) => configuredRepo === repoName || configuredRepo === fullName);
  if (exactMatch) {
    return exactMatch;
  }

  const ownerRepoMatch = fullName
    ? null
    : configuredRepos.find((configuredRepo) => configuredRepo.includes("/") && configuredRepo.split("/").at(-1) === repoName);
  return ownerRepoMatch ?? repoName;
}
