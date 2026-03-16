import { env } from "@/lib/env";

export function formatDateTime(date: Date, timeZone = env.TIMEZONE) {
  return new Intl.DateTimeFormat("en-CH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(date);
}

export function startOfToday(timeZone = env.TIMEZONE) {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return new Date(`${year}-${month}-${day}T00:00:00`);
}

type ZonedDateParts = {
  year: number;
  month: number;
  day: number;
};

export function scheduleForNextLocalSlot(
  timeZone: string,
  options: { dayOffset: number; hour: number; minute: number },
) {
  const now = new Date();
  const baseParts = getZonedDateParts(now, timeZone);
  const baseDate = new Date(Date.UTC(baseParts.year, baseParts.month - 1, baseParts.day));
  baseDate.setUTCDate(baseDate.getUTCDate() + options.dayOffset);

  return zonedDateTimeToUtc(
    {
      year: baseDate.getUTCFullYear(),
      month: baseDate.getUTCMonth() + 1,
      day: baseDate.getUTCDate(),
      hour: options.hour,
      minute: options.minute,
    },
    timeZone,
  );
}

export function parseNaturalLanguageSchedule(input: string, timeZone = env.TIMEZONE, now = new Date()) {
  const normalized = input.trim().toLowerCase().replace(/\s+/g, " ");
  if (!normalized) {
    return null;
  }

  const relativeMatch = normalized.match(/^in (\d+)\s*(minute|minutes|min|hour|hours|hr|hrs)$/);
  if (relativeMatch) {
    const amount = Number(relativeMatch[1]);
    const unit = relativeMatch[2];
    const scheduledFor = new Date(
      now.getTime() + amount * (unit.startsWith("hour") || unit.startsWith("hr") ? 60 * 60 * 1000 : 60 * 1000),
    );
    return { scheduledFor, label: formatDateTime(scheduledFor, timeZone) };
  }

  const withExplicitDate = parseExplicitDateTime(normalized, timeZone);
  if (withExplicitDate) {
    if (withExplicitDate.scheduledFor.getTime() <= now.getTime()) {
      return null;
    }
    return withExplicitDate;
  }

  const dayMatch = parseDayExpression(normalized, now, timeZone);
  if (!dayMatch) {
    return null;
  }

  const scheduledFor = zonedDateTimeToUtc(
    {
      year: dayMatch.year,
      month: dayMatch.month,
      day: dayMatch.day,
      hour: dayMatch.hour,
      minute: dayMatch.minute,
    },
    timeZone,
  );

  if (scheduledFor.getTime() <= now.getTime()) {
    return null;
  }

  return {
    scheduledFor,
    label: formatDateTime(scheduledFor, timeZone),
  };
}

function getZonedDateParts(date: Date, timeZone: string): ZonedDateParts {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
    day: Number(parts.find((part) => part.type === "day")?.value),
  };
}

function parseExplicitDateTime(input: string, timeZone: string) {
  const isoLikeMatch = input.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ t](\d{1,2})(?::(\d{2}))?)?$/);
  if (isoLikeMatch) {
    const hour = Number(isoLikeMatch[4] ?? "9");
    const minute = Number(isoLikeMatch[5] ?? "0");
    const scheduledFor = zonedDateTimeToUtc(
      {
        year: Number(isoLikeMatch[1]),
        month: Number(isoLikeMatch[2]),
        day: Number(isoLikeMatch[3]),
        hour,
        minute,
      },
      timeZone,
    );
    return { scheduledFor, label: formatDateTime(scheduledFor, timeZone) };
  }

  const euroMatch = input.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:[ ,]+(\d{1,2})(?::(\d{2}))?)?$/);
  if (euroMatch) {
    const hour = Number(euroMatch[4] ?? "9");
    const minute = Number(euroMatch[5] ?? "0");
    const scheduledFor = zonedDateTimeToUtc(
      {
        year: Number(euroMatch[3]),
        month: Number(euroMatch[2]),
        day: Number(euroMatch[1]),
        hour,
        minute,
      },
      timeZone,
    );
    return { scheduledFor, label: formatDateTime(scheduledFor, timeZone) };
  }

  return null;
}

function parseDayExpression(input: string, now: Date, timeZone: string) {
  const dayTokens = ["today", "tomorrow", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const periodDefaults: Record<string, { hour: number; minute: number }> = {
    morning: { hour: 9, minute: 0 },
    noon: { hour: 12, minute: 0 },
    afternoon: { hour: 14, minute: 0 },
    evening: { hour: 18, minute: 0 },
    tonight: { hour: 20, minute: 0 },
  };

  const firstToken = input.split(" ")[0];
  const hasNextPrefix = input.startsWith("next ");
  const dayToken = hasNextPrefix ? input.split(" ")[1] : firstToken;

  if (!dayTokens.includes(dayToken)) {
    return null;
  }

  const base = resolveTargetDate(dayToken, now, timeZone, hasNextPrefix);
  const remainder = input
    .replace(/^next /, "")
    .replace(dayToken, "")
    .trim()
    .replace(/^at /, "");

  const explicitTime = parseClockTime(remainder);
  const period = explicitTime ? null : parsePeriod(remainder, periodDefaults);
  const time = explicitTime ?? period ?? (dayToken === "today" ? nextRoundedTime(now, timeZone) : { hour: 9, minute: 0 });

  return {
    year: base.year,
    month: base.month,
    day: base.day,
    hour: time.hour,
    minute: time.minute,
  };
}

function resolveTargetDate(dayToken: string, now: Date, timeZone: string, hasNextPrefix: boolean) {
  const today = getZonedDateParts(now, timeZone);
  const todayDate = new Date(Date.UTC(today.year, today.month - 1, today.day));

  if (dayToken === "today") {
    return today;
  }

  if (dayToken === "tomorrow") {
    todayDate.setUTCDate(todayDate.getUTCDate() + 1);
    return {
      year: todayDate.getUTCFullYear(),
      month: todayDate.getUTCMonth() + 1,
      day: todayDate.getUTCDate(),
    };
  }

  const weekdayMap: Record<string, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };

  const targetWeekday = weekdayMap[dayToken];
  const currentWeekday = todayDate.getUTCDay();
  let delta = (targetWeekday - currentWeekday + 7) % 7;

  if (delta === 0 || hasNextPrefix) {
    delta += 7;
  }

  todayDate.setUTCDate(todayDate.getUTCDate() + delta);
  return {
    year: todayDate.getUTCFullYear(),
    month: todayDate.getUTCMonth() + 1,
    day: todayDate.getUTCDate(),
  };
}

function parseClockTime(input: string) {
  const match = input.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  if (!match) {
    return null;
  }

  let hour = Number(match[1]);
  const minute = Number(match[2] ?? "0");
  const meridiem = match[3];

  if (meridiem === "pm" && hour < 12) {
    hour += 12;
  }

  if (meridiem === "am" && hour === 12) {
    hour = 0;
  }

  if (hour > 23 || minute > 59) {
    return null;
  }

  return { hour, minute };
}

function parsePeriod(input: string, periodDefaults: Record<string, { hour: number; minute: number }>) {
  for (const [period, time] of Object.entries(periodDefaults)) {
    if (input.includes(period)) {
      return time;
    }
  }

  return null;
}

function nextRoundedTime(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(now);
  let hour = Number(parts.find((part) => part.type === "hour")?.value ?? "9");
  let minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");

  minute = minute <= 30 ? 30 : 0;
  if (minute === 0) {
    hour += 1;
  }

  if (hour > 23) {
    hour = 23;
    minute = 59;
  }

  return { hour, minute };
}

function zonedDateTimeToUtc(
  input: {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
  },
  timeZone: string,
) {
  const utcGuess = Date.UTC(input.year, input.month - 1, input.day, input.hour, input.minute);
  const offset = getTimeZoneOffsetMs(new Date(utcGuess), timeZone);
  return new Date(utcGuess - offset);
}

function getTimeZoneOffsetMs(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);

  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  const minute = Number(parts.find((part) => part.type === "minute")?.value);
  const second = Number(parts.find((part) => part.type === "second")?.value);

  const asUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  return asUtc - date.getTime();
}
