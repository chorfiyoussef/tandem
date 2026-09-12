"use client";

import { PASTEL_COLORS, PASTEL_LABELS, type PastelColor } from "@tandem/shared";
import { cn } from "@/lib/utils";
import { CheckIcon } from "@/components/icons";

export function asPastel(color?: string | null): PastelColor {
  return (PASTEL_COLORS as readonly string[]).includes(color ?? "") ? (color as PastelColor) : "gray";
}

export function ColorDot({ color, className, ring }: { color?: string | null; className?: string; ring?: boolean }) {
  const c = asPastel(color);
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block size-2.5 shrink-0 rounded-full",
        ring ? `border-2 bg-transparent` : `pastel-dot-${c}`,
        className,
      )}
      style={ring ? { borderColor: `var(--pastel-${c}-dot)` } : undefined}
    />
  );
}

export function ColorSwatches({
  value,
  onChange,
  className,
}: {
  value: PastelColor;
  onChange: (c: PastelColor) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)} role="radiogroup" aria-label="Color">
      {PASTEL_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={value === c}
          aria-label={PASTEL_LABELS[c]}
          title={PASTEL_LABELS[c]}
          onClick={() => onChange(c)}
          className={cn(
            "flex size-6 items-center justify-center rounded-full transition-transform focus-visible:ring-3 focus-visible:ring-ring/40 outline-none",
            `pastel-dot-${c}`,
            value === c ? "scale-110" : "hover:scale-105",
          )}
        >
          {value === c ? <CheckIcon className="size-3.5 text-white drop-shadow-sm" strokeWidth={3} /> : null}
        </button>
      ))}
    </div>
  );
}
