"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useQuery } from "@tanstack/react-query";
import { HomeIcon, InboxIcon, PlusIcon, SettingsIcon, SunMoonIcon, ListIcon, UsersIcon } from "@/components/icons";
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandShortcut } from "@/components/ui/command";
import { useUi } from "@/stores/ui";
import { useWorkspace } from "@/components/workspace-provider";
import { useLists, useSpaces, useStatuses } from "@/lib/queries/workspace";
import { createClient } from "@/lib/supabase/client";
import { StatusDot } from "@/components/tasks/status-dot";
import { asPastel } from "@/components/common/pastel";
import { SpaceIcon } from "@/components/common/space-icon";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/types";

export function CommandPalette() {
  const open = useUi((s) => s.paletteOpen);
  const setOpen = useUi((s) => s.setPaletteOpen);
  const openNewTask = useUi((s) => s.openNewTask);
  const router = useRouter();
  const { workspace, href } = useWorkspace();
  const { data: lists } = useLists(workspace.id);
  const { data: spaces } = useSpaces(workspace.id);
  const { data: statuses } = useStatuses(workspace.id);
  const { setTheme, resolvedTheme } = useTheme();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 150);
    return () => clearTimeout(t);
  }, [query]);

  const { data: results } = useQuery({
    queryKey: ["search", workspace.id, debounced],
    enabled: open && debounced.length >= 2,
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("search_tasks", { p_workspace: workspace.id, p_query: debounced, p_limit: 12 });
      if (error) throw error;
      return data as Task[];
    },
    staleTime: 5_000,
  });

  const go = (path: string) => {
    setOpen(false);
    router.push(path);
  };

  const listItems = useMemo(
    () =>
      (lists ?? []).map((l) => ({
        list: l,
        space: spaces?.find((s) => s.id === l.space_id),
      })),
    [lists, spaces],
  );

  return (
    <CommandDialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQuery(""); }} title="Search" description="Search tasks, jump to a list, or run an action." className="sm:max-w-lg">
      <Command loop>
      <CommandInput placeholder="Search tasks or type a command…" value={query} onValueChange={setQuery} />
      <CommandList className="max-h-[min(60vh,420px)]">
        <CommandEmpty>Nothing matches “{query}”.</CommandEmpty>

        {results && results.length > 0 ? (
          <CommandGroup heading="Tasks">
            {results.map((t) => {
              const status = statuses?.find((s) => s.id === t.status_id);
              return (
                <CommandItem key={t.id} value={`${t.title} ${workspace.task_prefix}-${t.number}`} onSelect={() => go(href(`/l/${t.list_id}?task=${t.id}`))}>
                  <StatusDot color={status?.color} category={status?.category} />
                  <span className="tabular text-ink-3">
                    {workspace.task_prefix}-{t.number}
                  </span>
                  <span className={cn("flex-1 truncate", t.completed_at && "text-ink-3 line-through")}>{t.title}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        ) : null}

        <CommandGroup heading="Actions">
          <CommandItem value="new task" onSelect={() => { setOpen(false); openNewTask(); }}>
            <PlusIcon />
            New task
            <CommandShortcut>C</CommandShortcut>
          </CommandItem>
          <CommandItem value="toggle theme dark light" onSelect={() => { setTheme(resolvedTheme === "dark" ? "light" : "dark"); setOpen(false); }}>
            <SunMoonIcon />
            Switch to {resolvedTheme === "dark" ? "light" : "dark"} appearance
          </CommandItem>
        </CommandGroup>

        <CommandGroup heading="Go to">
          <CommandItem value="go home my work" onSelect={() => go(href())}>
            <HomeIcon />
            Home
            <CommandShortcut>G H</CommandShortcut>
          </CommandItem>
          <CommandItem value="go inbox notifications" onSelect={() => go(href("/inbox"))}>
            <InboxIcon />
            Inbox
            <CommandShortcut>G I</CommandShortcut>
          </CommandItem>
          <CommandItem value="go settings members" onSelect={() => go(href("/settings"))}>
            <SettingsIcon />
            Settings
            <CommandShortcut>G S</CommandShortcut>
          </CommandItem>
          <CommandItem value="go members people" onSelect={() => go(href("/settings/members"))}>
            <UsersIcon />
            Members
          </CommandItem>
        </CommandGroup>

        {listItems.length > 0 ? (
          <CommandGroup heading="Lists">
            {listItems.map(({ list, space }) => (
              <CommandItem key={list.id} value={`list ${space?.name ?? ""} ${list.name}`} onSelect={() => go(href(`/l/${list.id}`))}>
                {space ? <SpaceIcon name={space.icon} className={cn("size-4", `pastel-text-${asPastel(space.color)}`)} /> : <ListIcon />}
                <span className="text-ink-3">{space?.name}</span>
                <span className="truncate">{list.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}
      </CommandList>
      </Command>
    </CommandDialog>
  );
}
