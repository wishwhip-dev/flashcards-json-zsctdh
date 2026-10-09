/**
 * Local calendar-day helpers.
 *
 * Days are counted by the local calendar — never by dividing milliseconds — so a card due at
 * midnight, or across a daylight-saving shift, is due on exactly the day it says.
 *
 * A day key is a local `YYYY-MM-DD` string. ISO keys compare correctly as strings, which is all
 * "is this card due?" and "which of the next 7 days?" need.
 */

export function toDayKey(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function todayKey(): string {
  return toDayKey(new Date());
}

/** Midnight of the key's day, in the visitor's own time zone. */
export function parseDayKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function addDaysToKey(key: string, days: number): string {
  const date = parseDayKey(key);
  date.setDate(date.getDate() + days);
  return toDayKey(date);
}

/** `"2026-10-09"` → `"Fri, Oct 9"` in the visitor's locale. Render after hydration only. */
export function formatDayKey(key: string): string {
  return parseDayKey(key).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
