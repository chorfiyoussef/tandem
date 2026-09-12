import {
  differenceInCalendarDays,
  format,
  isSameYear,
  isToday,
  isTomorrow,
  isYesterday,
  parseISO,
  startOfDay,
} from "date-fns";

/** Parse a `date` column ("2026-09-12") as a local date. */
export function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

/** Serialize a local date for a `date` column. */
export function toDateString(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export type DueTone = "overdue" | "today" | "soon" | "later" | "none";

export function dueTone(value: string | null | undefined, completed?: boolean): DueTone {
  const date = parseDate(value);
  if (!date) return "none";
  if (completed) return "later";
  const diff = differenceInCalendarDays(date, startOfDay(new Date()));
  if (diff < 0) return "overdue";
  if (diff === 0) return "today";
  if (diff <= 2) return "soon";
  return "later";
}

/** "Today", "Tomorrow", "Mon", "Sep 20", "Sep 20, 2027" */
export function formatDue(value: string | null | undefined): string {
  const date = parseDate(value);
  if (!date) return "";
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  if (isYesterday(date)) return "Yesterday";
  const diff = differenceInCalendarDays(date, startOfDay(new Date()));
  if (diff > 0 && diff < 7) return format(date, "EEE");
  return isSameYear(date, new Date()) ? format(date, "MMM d") : format(date, "MMM d, yyyy");
}

/** "just now", "4m", "2h", "3d", "Sep 20" — for timestamps. */
export function formatRelative(iso: string): string {
  const date = parseISO(iso);
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d`;
  return isSameYear(date, new Date()) ? format(date, "MMM d") : format(date, "MMM d, yyyy");
}

export function formatDateTime(iso: string): string {
  return format(parseISO(iso), "EEE, MMM d 'at' h:mm a");
}

export function greeting(name?: string | null): string {
  const hour = new Date().getHours();
  const part = hour < 5 ? "Good night" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const first = name?.trim().split(/\s+/)[0];
  return first ? `${part}, ${first}` : part;
}
