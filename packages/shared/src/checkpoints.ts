import { FOLLOW_UP_DUE_CALENDAR_DAYS } from "./types.js";

/** Parse YYYY-MM-DD as a UTC calendar date. */
export function parseIsoDate(isoDate: string): Date {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addCalendarDays(isoDate: string, days: number): string {
  const d = parseIsoDate(isoDate);
  d.setUTCDate(d.getUTCDate() + days);
  return formatIsoDate(d);
}

/**
 * Follow-up is due when entryDate + FOLLOW_UP_DUE_CALENDAR_DAYS <= today
 * and no follow_up snapshot exists yet.
 */
export function isFollowUpDue(
  entryDate: string,
  today: string,
  hasFollowUp: boolean,
): boolean {
  if (hasFollowUp) return false;
  const dueOn = addCalendarDays(entryDate, FOLLOW_UP_DUE_CALENDAR_DAYS);
  return dueOn <= today;
}
