"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PageHeader } from "@/components/shell/page-header";
import { useWorkspace } from "@/components/workspace-provider";
import { cn } from "@/lib/utils";

export function SettingsShell({ children }: { children: React.ReactNode }) {
  const { href } = useWorkspace();
  const pathname = usePathname();
  const items = [
    { label: "General", path: href("/settings") },
    { label: "Members", path: href("/settings/members") },
    { label: "Categories", path: href("/settings/categories") },
    { label: "Tags", path: href("/settings/tags") },
    { label: "Profile", path: href("/settings/profile") },
  ];
  return (
    <>
      <PageHeader title="Settings" />
      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 pb-24 pt-6 md:flex-row md:gap-10 md:px-6">
          <nav className="flex shrink-0 gap-1 overflow-x-auto md:w-40 md:flex-col scrollbar-none">
            {items.map((i) => {
              const active = pathname === i.path;
              return (
                <Link
                  key={i.path}
                  href={i.path}
                  aria-current={active ? "page" : undefined}
                  className={cn("h-7 shrink-0 rounded-md px-2 text-[14px] leading-7 transition-colors", active ? "bg-muted font-medium text-ink" : "text-ink-2 hover:bg-muted/60 hover:text-ink")}
                >
                  {i.label}
                </Link>
              );
            })}
          </nav>
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </div>
    </>
  );
}

export function SettingsSection({ title, description, children, danger }: { title: string; description?: string; children: React.ReactNode; danger?: boolean }) {
  return (
    <section className="mb-8">
      <h2 className={cn("text-[16px] font-semibold tracking-[-0.01em]", danger && "text-destructive")}>{title}</h2>
      {description ? <p className="mt-0.5 text-[14px] text-ink-2">{description}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}
