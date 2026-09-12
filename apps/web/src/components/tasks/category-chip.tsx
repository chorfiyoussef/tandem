"use client";

import { asPastel } from "@/components/common/pastel";
import { cn } from "@/lib/utils";
import type { Category } from "@/lib/types";

/** A category reads as a small tinted label with a leading dot, distinct from tags (rounded pills). */
export function CategoryChip({ category, className }: { category: Pick<Category, "name" | "color">; className?: string }) {
  const c = asPastel(category.color);
  return (
    <span className={cn("inline-flex h-5 max-w-36 items-center gap-1.5 rounded-md px-1.5 text-[11px] font-medium leading-none", `pastel-${c}`, className)}>
      <span className={cn("size-1.5 shrink-0 rounded-full", `pastel-dot-${c}`)} aria-hidden />
      <span className="truncate">{category.name}</span>
    </span>
  );
}
