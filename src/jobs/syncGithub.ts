import { ingestGithubEvents } from "@/services/github/ingest";

export async function runGithubSyncJob() {
  const result = await ingestGithubEvents();
  return { ...result, phase: 2 };
}
