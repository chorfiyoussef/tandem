export type RecurrenceUnit = "day" | "week" | "month" | "year";
export type Recurrence = { every: number; unit: RecurrenceUnit };

export const RECURRENCE_PRESETS: { label: string; value: Recurrence }[] = [
  { label: "Every day", value: { every: 1, unit: "day" } },
  { label: "Every week", value: { every: 1, unit: "week" } },
  { label: "Every 2 weeks", value: { every: 2, unit: "week" } },
  { label: "Every month", value: { every: 1, unit: "month" } },
  { label: "Every 3 months", value: { every: 3, unit: "month" } },
  { label: "Every year", value: { every: 1, unit: "year" } },
];

export function parseRecurrence(value: unknown): Recurrence | null {
  if (!value || typeof value !== "object") return null;
  const v = value as { every?: unknown; unit?: unknown };
  const every = typeof v.every === "number" ? v.every : Number(v.every);
  const unit = v.unit;
  if (!Number.isFinite(every) || every < 1) return null;
  if (unit !== "day" && unit !== "week" && unit !== "month" && unit !== "year") return null;
  return { every, unit };
}

/** "Every 2 weeks", "Every day" */
export function recurrenceLabel(r: Recurrence | null | undefined): string {
  if (!r) return "Doesn’t repeat";
  const noun = r.every === 1 ? r.unit : `${r.every} ${r.unit}s`;
  return `Every ${noun}`;
}

/** Short form for rows and cards: "Daily", "Weekly", "2 wk", "Monthly", "3 mo", "Yearly" */
export function recurrenceShort(r: Recurrence | null | undefined): string {
  if (!r) return "";
  if (r.every === 1) return { day: "Daily", week: "Weekly", month: "Monthly", year: "Yearly" }[r.unit];
  return `${r.every} ${{ day: "d", week: "wk", month: "mo", year: "yr" }[r.unit]}`;
}

export function sameRecurrence(a: Recurrence | null, b: Recurrence | null): boolean {
  return !!a && !!b && a.every === b.every && a.unit === b.unit;
}
