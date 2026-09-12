"use client";

import { PanelLeftIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Kbd } from "@/components/ui/kbd";
import { useUi } from "@/stores/ui";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  icon,
  crumbs,
  children,
  className,
}: {
  title: React.ReactNode;
  icon?: React.ReactNode;
  crumbs?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  const sidebarOpen = useUi((s) => s.sidebarOpen);
  const toggleSidebar = useUi((s) => s.toggleSidebar);
  const isMobile = useIsMobile();

  return (
    <header className={cn("flex h-12 shrink-0 items-center gap-2 px-3 hairline-b md:px-4", className)}>
      {(!sidebarOpen || isMobile) && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" onClick={toggleSidebar} aria-label="Show sidebar" className="-ml-1 text-ink-2">
              <PanelLeftIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Show sidebar <Kbd>⌘\</Kbd>
          </TooltipContent>
        </Tooltip>
      )}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {icon ? <span className="flex shrink-0 items-center text-ink-2">{icon}</span> : null}
        <div className="flex min-w-0 items-center gap-1.5">
          {crumbs}
          <h1 className="truncate text-[14px] font-semibold tracking-[-0.01em] text-ink">{title}</h1>
        </div>
      </div>
      {children ? <div className="flex shrink-0 items-center gap-1">{children}</div> : null}
    </header>
  );
}
