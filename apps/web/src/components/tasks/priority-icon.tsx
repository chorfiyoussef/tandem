"use client";

import { cn } from "@/lib/utils";
import type { TaskPriority } from "@/lib/types";

const TONE: Record<TaskPriority, string> = {
  urgent: "text-destructive",
  high: "pastel-text-peach",
  normal: "pastel-text-sky",
  low: "text-ink-3",
  none: "text-ink-3",
};

/** Three rising bars; the number of filled bars encodes the priority. Urgent is the only hard colour. */
export function PriorityIcon({ priority, className }: { priority: TaskPriority; className?: string }) {
  const level = priority === "urgent" ? 3 : priority === "high" ? 3 : priority === "normal" ? 2 : priority === "low" ? 1 : 0;
  return (
    <svg viewBox="0 0 14 14" width="14" height="14" aria-hidden className={cn("shrink-0", TONE[priority], className)}>
      {[0, 1, 2].map((i) => (
        <rect
          key={i}
          x={1 + i * 4.5}
          y={9 - i * 3}
          width="3"
          height={4 + i * 3}
          rx="1"
          fill="currentColor"
          opacity={i < level ? 1 : 0.22}
        />
      ))}
      {priority === "urgent" ? <circle cx="11.5" cy="2.5" r="2.2" fill="currentColor" /> : null}
    </svg>
  );
}
