"use client";

import { CalendarIcon } from "@/components/icons";
import { dueTone, formatDue } from "@/lib/dates";
import { cn } from "@/lib/utils";

export function DueLabel({ date, completed, className, showIcon = true }: { date: string | null; completed?: boolean; className?: string; showIcon?: boolean }) {
  if (!date) return null;
  const tone = dueTone(date, completed);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap text-[12px] tabular",
        tone === "overdue" && "font-medium text-destructive",
        tone === "today" && "font-medium text-ink",
        (tone === "soon" || tone === "later") && "text-ink-2",
        completed && "text-ink-3",
        className,
      )}
    >
      {showIcon ? <CalendarIcon className="size-3.5" /> : null}
      {formatDue(date)}
    </span>
  );
}
