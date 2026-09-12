import { cn } from "@/lib/utils";

/** Two overlapping circles: two people, one rhythm. No backplate. */
export function LogoMark({ className, size = 28 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden className={cn("shrink-0", className)}>
      <circle cx="23" cy="32" r="15" className="fill-[var(--pastel-lavender-dot)]" />
      <circle cx="41" cy="32" r="15" className="fill-[var(--pastel-mint-dot)]" fillOpacity={0.92} />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return <span className={cn("font-semibold tracking-[-0.02em] text-ink", className)}>Tandem</span>;
}
