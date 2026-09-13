"use client";

import { asPastel } from "@/components/common/pastel";
import { cn } from "@/lib/utils";

export function TagChip({ name, color, className, onRemove }: { name: string; color?: string | null; className?: string; onRemove?: () => void }) {
  return (
    <span className={cn("inline-flex h-5 max-w-32 items-center gap-1 rounded-full px-2 text-[12px] font-medium leading-none", `pastel-${asPastel(color)}`, className)}>
      <span className="truncate">{name}</span>
      {onRemove ? (
        <button type="button" onClick={onRemove} aria-label={`Remove ${name}`} className="-mr-1 rounded-full px-1 opacity-60 hover:opacity-100">
          ×
        </button>
      ) : null}
    </span>
  );
}
