import { getConfiguredGithubRepos } from "@/lib/env";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { getGithubClient } from "@/services/github/client";

export async function syncConfiguredGithubWebhooks(active: boolean) {
  const repos = getConfiguredGithubRepos();
  const webhookUrl = `${env.APP_URL.replace(/\/$/, "")}/api/github/webhook`;

  if (repos.length === 0) {
    return { updated: 0, skipped: 0, errors: [] as Array<{ repoName: string; error: string }> };
  }

  const client = getGithubClient();
  let updated = 0;
  let skipped = 0;
  const errors: Array<{ repoName: string; error: string }> = [];

  for (const repoName of repos) {
    try {
      const hooks = await client.listWebhooks(repoName);
      const matchingHooks = hooks.filter((hook) => isSignalToPostHook(hook.config?.url, webhookUrl));

      if (matchingHooks.length === 0) {
        skipped += 1;
        continue;
      }

      for (const hook of matchingHooks) {
        if (hook.active === active) {
          skipped += 1;
          continue;
        }

        await client.updateWebhook(repoName, hook.id, { active });
        updated += 1;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected GitHub webhook sync error";
      errors.push({ repoName, error: message });
      logger.warn("GitHub webhook sync failed", { repoName, active, error });
    }
  }

  return { updated, skipped, errors };
}

function isSignalToPostHook(candidateUrl: string | undefined, webhookUrl: string) {
  if (!candidateUrl) {
    return false;
  }

  const normalizedCandidate = candidateUrl.replace(/\/$/, "");
  return normalizedCandidate === webhookUrl || normalizedCandidate.endsWith("/api/github/webhook");
}
