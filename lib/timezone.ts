export const TIMEZONE_HEADER = "x-user-timezone";

export function getBrowserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function getTimeZoneHeaders() {
  return {
    [TIMEZONE_HEADER]: getBrowserTimeZone(),
  };
}

export function getTimeZoneFromHeaders(headers: Headers) {
  const requested = headers.get(TIMEZONE_HEADER) ?? "UTC";
  return isValidTimeZone(requested) ? requested : "UTC";
}

export function isValidTimeZone(timeZone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function toDateKeyInTimeZone(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function dateFromKey(dayKey: string) {
  return new Date(`${dayKey}T12:00:00.000Z`);
}

export function addDaysToDateKey(dayKey: string, days: number, timeZone: string) {
  const date = dateFromKey(dayKey);
  date.setUTCDate(date.getUTCDate() + days);
  return toDateKeyInTimeZone(date, timeZone);
}

export function getWeekdayInTimeZone(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone }).format(date);
}

export function getWeekdayIndexInTimeZone(date: Date, timeZone: string) {
  const weekday = getWeekdayInTimeZone(date, timeZone);
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[weekday] ?? 0;
}

export function startOfWeekKeyInTimeZone(date: Date, timeZone: string) {
  const todayKey = toDateKeyInTimeZone(date, timeZone);
  const weekdayIndex = getWeekdayIndexInTimeZone(date, timeZone);
  const mondayOffset = (weekdayIndex + 6) % 7;
  return addDaysToDateKey(todayKey, -mondayOffset, timeZone);
}
