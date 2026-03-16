import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { runPublishScheduledJob } from "@/jobs/publishScheduled";

declare global {
  // eslint-disable-next-line no-var
  var __signalToPostPublishScheduler__: NodeJS.Timeout | undefined;
}

export function initLocalScheduler() {
  if (
    !env.ENABLE_LOCAL_SCHEDULER ||
    env.NODE_ENV !== "development" ||
    process.env.NODE_ENV === "test" ||
    process.env.NEXT_PHASE === "phase-production-build"
  ) {
    return;
  }

  if (global.__signalToPostPublishScheduler__) {
    return;
  }

  const intervalMs = env.LOCAL_PUBLISH_POLL_SECONDS * 1000;
  logger.info("Starting local publish scheduler", {
    intervalSeconds: env.LOCAL_PUBLISH_POLL_SECONDS,
  });

  global.__signalToPostPublishScheduler__ = setInterval(async () => {
    try {
      const result = await runPublishScheduledJob();
      if (result.processed > 0) {
        logger.info("Processed scheduled publish jobs", result);
      }
    } catch (error) {
      logger.error("Local publish scheduler failed", error);
    }
  }, intervalMs);
}
