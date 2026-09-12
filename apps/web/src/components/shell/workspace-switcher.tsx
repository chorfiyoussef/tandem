"use client";

import Link from "next/link";
import { ChevronDownIcon, CheckIcon, PlusIcon, SettingsIcon } from "@/components/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWorkspace } from "@/components/workspace-provider";
import { cn } from "@/lib/utils";
import type { WorkspaceSummary } from "./app-shell";

export function WorkspaceMark({ name, className }: { name: string; className?: string }) {
  return (
    <span
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-md pastel-lavender text-[11px] font-semibold",
        className,
      )}
      aria-hidden
    >
      {name.trim().charAt(0).toUpperCase() || "W"}
    </span>
  );
}

export function WorkspaceSwitcher({ workspaces }: { workspaces: WorkspaceSummary[] }) {
  const { workspace, href } = useWorkspace();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-lg px-1.5 text-left transition-colors hover:bg-sidebar-accent aria-expanded:bg-sidebar-accent outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
        >
          <WorkspaceMark name={workspace.name} />
          <span className="min-w-0 flex-1 truncate text-[13px] font-semibold tracking-[-0.01em]">{workspace.name}</span>
          <ChevronDownIcon className="size-3.5 shrink-0 text-ink-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        {workspaces.map((w) => (
          <DropdownMenuItem key={w.id} asChild>
            <Link href={`/${w.slug}`} className="gap-2">
              <WorkspaceMark name={w.name} />
              <span className="flex-1 truncate">{w.name}</span>
              {w.id === workspace.id ? <CheckIcon className="size-3.5 text-ink-2" /> : null}
            </Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={href("/settings")}>
            <SettingsIcon />
            Workspace settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/onboarding">
            <PlusIcon />
            New workspace
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
