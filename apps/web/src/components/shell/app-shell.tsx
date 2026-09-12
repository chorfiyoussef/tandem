"use client";

import { useEffect } from "react";
import { Sidebar } from "./sidebar";
import { useUi } from "@/stores/ui";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { Workspace } from "@/lib/types";
import { CommandPalette } from "./command-palette";
import { NewTaskDialog } from "@/components/tasks/new-task-dialog";
import { TaskSheet } from "@/components/tasks/task-sheet";
import { KeyboardShortcuts } from "./keyboard-shortcuts";
import { useIsMobile } from "@/hooks/use-mobile";

export type WorkspaceSummary = Pick<Workspace, "id" | "name" | "slug" | "icon">;

export function AppShell({ workspaces, children }: { workspaces: WorkspaceSummary[]; children: React.ReactNode }) {
  const sidebarOpen = useUi((s) => s.sidebarOpen);
  const setSidebarOpen = useUi((s) => s.setSidebarOpen);
  const isMobile = useIsMobile();

  // On small screens the sidebar is an overlay that starts closed.
  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [isMobile, setSidebarOpen]);

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-canvas">
      {isMobile ? (
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" showCloseButton={false} className="w-[280px] gap-0 border-0 bg-sidebar p-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <Sidebar workspaces={workspaces} />
          </SheetContent>
        </Sheet>
      ) : (
        <aside
          className={cn(
            "relative h-full shrink-0 overflow-hidden bg-sidebar transition-[width] duration-200 ease-out-soft",
            sidebarOpen ? "w-[248px]" : "w-0",
          )}
        >
          <div className="h-full w-[248px]">
            <Sidebar workspaces={workspaces} />
          </div>
        </aside>
      )}

      <main className="relative flex min-w-0 flex-1 flex-col bg-surface hairline-l md:my-0">
        {children}
      </main>

      <TaskSheet />
      <CommandPalette />
      <NewTaskDialog />
      <KeyboardShortcuts />
    </div>
  );
}
