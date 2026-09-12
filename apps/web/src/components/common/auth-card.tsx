import { cn } from "@/lib/utils";

export function AuthCard({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl bg-surface p-6 shadow-card", className)}>
      <h1 className="text-[17px] font-semibold tracking-[-0.01em] text-ink">{title}</h1>
      {subtitle ? <p className="mt-1 text-[13px] text-ink-2">{subtitle}</p> : null}
      {children ? <div className="mt-5">{children}</div> : null}
    </div>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-lg bg-destructive/8 px-3 py-2 text-[13px] text-destructive">
      {message}
    </p>
  );
}
