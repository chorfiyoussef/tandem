"use client";

import { CheckIcon } from "@/components/icons";
import { asPastel } from "@/components/common/pastel";
import { cn } from "@/lib/utils";
import type { StatusCategory } from "@/lib/types";

/** Hollow ring for "to do", solid for "active", solid with a check for "done". */
export function StatusDot({
  color,
  category = "todo",
  className,
  size = 14,
}: {
  color?: string | null;
  category?: StatusCategory | null;
  className?: string;
  size?: number;
}) {
  const c = asPastel(color);
  const dot = `var(--pastel-${c}-dot)`;
  return (
    <span
      aria-hidden
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full", className)}
      style={{
        width: size,
        height: size,
        background: category === "todo" ? "transparent" : dot,
        boxShadow: category === "todo" ? `inset 0 0 0 1.5px ${dot}` : undefined,
      }}
    >
      {category === "done" ? <CheckIcon className="text-white" style={{ width: size * 0.65, height: size * 0.65 }} strokeWidth={3.5} /> : null}
    </span>
  );
}
