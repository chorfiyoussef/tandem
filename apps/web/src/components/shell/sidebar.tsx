"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HomeIcon, HomeFilledIcon, InboxIcon, InboxFilledIcon, SearchIcon, PanelLeftCloseIcon, SettingsIcon } from "@/components/icons";
import { useWorkspace } from "@/components/workspace-provider";
import { useUi } from "@/stores/ui";
import { useNotifications } from "@/lib/queries/notifications";
import { Kbd } from "@/components/ui/kbd";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { WorkspaceSwitcher } from "./workspace-switcher";
import { UserMenu } from "./user-menu";
import { SidebarSpaces } from "./sidebar-spaces";
import type { WorkspaceSummary } from "./app-shell";
import { useIsMobile } from "@/hooks/use-mobile";

export function Sidebar({ workspaces }: { workspaces: WorkspaceSummary[] }) {
  const { href, userId } = useWorkspace();
  const pathname = usePathname();
  const setPaletteOpen = useUi((s) => s.setPaletteOpen);
  const toggleSidebar = useUi((s) => s.toggleSidebar);
  const setSidebarOpen = useUi((s) => s.setSidebarOpen);
  const isMobile = useIsMobile();
  const { data: notifications } = useNotifications(userId);
  const unread = notifications?.filter((n) => !n.read_at).length ?? 0;

  const closeOnMobile = () => isMobile && setSidebarOpen(false);

  return (
    <div className="flex h-full flex-col text-[13px] text-sidebar-foreground">
      <div className="flex items-center gap-1 px-2.5 pt-2.5">
        <WorkspaceSwitcher workspaces={workspaces} />
        {!isMobile && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-sm" onClick={toggleSidebar} aria-label="Hide sidebar" className="text-ink-3 hover:text-ink">
                <PanelLeftCloseIcon />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Hide sidebar <Kbd>⌘\</Kbd>
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      <div className="px-2.5 pt-2.5">
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          className="flex h-8 w-full items-center gap-2 rounded-lg bg-black/[0.045] px-2.5 text-ink-2 transition-colors hover:bg-black/[0.07] dark:bg-white/[0.06] dark:hover:bg-white/[0.09]"
        >
          <SearchIcon className="size-3.5" />
          <span className="flex-1 text-left">Search</span>
          <Kbd className="bg-transparent text-ink-3">⌘K</Kbd>
        </button>
      </div>

      <nav className="mt-2.5 flex flex-col gap-px px-2.5">
        <NavItem href={href()} active={pathname === href()} icon={pathname === href() ? <HomeFilledIcon /> : <HomeIcon />} onClick={closeOnMobile}>
          Home
        </NavItem>
        <NavItem href={href("/inbox")} active={pathname.startsWith(href("/inbox"))} icon={pathname.startsWith(href("/inbox")) ? <InboxFilledIcon /> : <InboxIcon />} onClick={closeOnMobile}>
          <span className="flex-1">Inbox</span>
          {unread > 0 ? (
            <span className="tabular rounded-full pastel-sky px-1.5 py-px text-[11px] font-medium leading-4">{unread > 99 ? "99+" : unread}</span>
          ) : null}
        </NavItem>
      </nav>

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto px-2.5 pb-2 scrollbar-thin">
        <SidebarSpaces onNavigate={closeOnMobile} />
      </div>

      <div className="flex items-center gap-1 px-2.5 pb-2.5 pt-1.5">
        <UserMenu />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button asChild variant="ghost" size="icon-sm" className="text-ink-3 hover:text-ink" aria-label="Workspace settings">
              <Link href={href("/settings")} onClick={closeOnMobile}>
                <SettingsIcon />
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Settings</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

export function NavItem({
  href,
  active,
  icon,
  children,
  className,
  onClick,
}: {
  href: string;
  active?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-7 items-center gap-2 rounded-md px-2 text-ink-2 transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/40 [&_svg]:size-[15px] [&_svg]:shrink-0",
        active ? "bg-sidebar-accent font-medium text-ink" : "hover:bg-sidebar-accent/70 hover:text-ink",
        className,
      )}
    >
      {icon}
      <span className="flex min-w-0 flex-1 items-center gap-2 truncate">{children}</span>
    </Link>
  );
}
