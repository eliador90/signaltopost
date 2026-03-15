import type { Draft, User } from "@prisma/client";
import { prisma } from "@/lib/db";
import { formatDateTime, scheduleForNextLocalSlot } from "@/lib/time";
import { enqueuePost } from "@/services/posts/queue";

export type SchedulePreset = "tomorrow_0900" | "tomorrow_1400";

const presetConfig: Record<
  SchedulePreset,
  {
    dayOffset: number;
    hour: number;
    minute: number;
    label: string;
  }
> = {
  tomorrow_0900: {
    dayOffset: 1,
    hour: 9,
    minute: 0,
    label: "tomorrow 09:00",
  },
  tomorrow_1400: {
    dayOffset: 1,
    hour: 14,
    minute: 0,
    label: "tomorrow 14:00",
  },
};

export async function schedulePost(
  draft: Draft,
  user: Pick<User, "id" | "timezone">,
  preset: SchedulePreset,
) {
  const config = presetConfig[preset];
  const scheduledFor = scheduleForNextLocalSlot(user.timezone, config);

  const job = await enqueuePost(draft, scheduledFor);

  await prisma.draft.update({
    where: { id: draft.id },
    data: {
      status: "SCHEDULED",
      scheduledFor,
    },
  });

  return {
    job,
    scheduledFor,
    label: `${config.label} (${formatDateTime(scheduledFor, user.timezone)})`,
  };
}

export function isSchedulePreset(value: string): value is SchedulePreset {
  return value in presetConfig;
}
