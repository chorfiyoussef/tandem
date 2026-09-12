"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDaysIcon, ChevronRightIcon, KanbanIcon, ListIcon, PlusIcon, SlidersHorizontalIcon, PinIcon, PinFilledIcon } from "@/components/icons";
import { PageHeader } from "@/components/shell/page-header";
import { useWorkspace } from "@/components/workspace-provider";
import { useLists, useSpaces, useUpdateList, useFavorites, useToggleFavorite, useCategories } from "@/lib/queries/workspace";
import { useListTasks } from "@/lib/queries/tasks";
import { useUi, type ListGroupBy } from "@/stores/ui";
import { ListView } from "@/components/tasks/list-view";
import { BoardView } from "@/components/tasks/board-view";
import { CalendarView } from "@/components/tasks/calendar-view";
import { SpaceIcon } from "@/components/common/space-icon";
import { asPastel } from "@/components/common/pastel";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ColorDot } from "@/components/common/pastel";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { InlineNameInput } from "@/components/common/inline-name-input";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import type { ViewType } from "@tandem/shared";
import { cn } from "@/lib/utils";

export function ListPage({ listId }: { listId: string }) {
  const { workspace, userId, canEdit, href } = useWorkspace();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: lists, isPending: listsPending } = useLists(workspace.id);
  const { data: spaces } = useSpaces(workspace.id);
  const { data: tasks, isPending, isError, refetch } = useListTasks(listId);
  const { data: favorites } = useFavorites(userId);
  const toggleFavorite = useToggleFavorite(userId);
  const updateList = useUpdateList(workspace.id);
  const openNewTask = useUi((s) => s.openNewTask);
  const setLastListId = useUi((s) => s.setLastListId);
  const [renaming, setRenaming] = useState(false);
  const [mine, setMine] = useState(false);
  const [hideDone, setHideDone] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const { data: categories } = useCategories(workspace.id);
  const groupBy = useUi((s) => s.listGroupBy[listId] ?? "status");
  const setListGroupBy = useUi((s) => s.setListGroupBy);

  const list = lists?.find((l) => l.id === listId);
  const space = spaces?.find((s) => s.id === list?.space_id);
  const view = ((searchParams.get("view") as ViewType | null) ?? list?.default_view ?? "list") as ViewType;
  const isFav = favorites?.includes(listId) ?? false;

  useEffect(() => {
    setLastListId(listId);
  }, [listId, setLastListId]);

  const setView = (v: ViewType) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", v);
    router.replace(`${href(`/l/${listId}`)}?${params.toString()}`, { scroll: false });
    if (canEdit && list && list.default_view !== v) updateList.mutate({ id: listId, default_view: v });
  };

  const filtered = useMemo(() => {
    let out = tasks ?? [];
    if (mine) out = out.filter((t) => t.task_assignees.some((a) => a.user_id === userId));
    if (hideDone) out = out.filter((t) => !t.completed_at);
    if (categoryFilter === "none") out = out.filter((t) => !t.category_id);
    else if (categoryFilter !== "all") out = out.filter((t) => t.category_id === categoryFilter);
    return out;
  }, [tasks, mine, hideDone, categoryFilter, userId]);

  if (!listsPending && !list) {
    return (
      <>
        <PageHeader title="List not found" />
        <Empty className="flex-1">
          <EmptyHeader>
            <EmptyTitle>This list doesn’t exist</EmptyTitle>
            <EmptyDescription>It may have been deleted, or you don’t have access to its space.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={
          renaming && list ? (
            <InlineNameInput
              defaultValue={list.name}
              className="h-7 w-56"
              onCancel={() => setRenaming(false)}
              onSubmit={(name) => {
                setRenaming(false);
                if (name !== list.name) updateList.mutate({ id: list.id, name });
              }}
            />
          ) : (
            <button
              type="button"
              onClick={() => canEdit && setRenaming(true)}
              className={cn("truncate rounded px-1 -mx-1", canEdit && "hover:bg-muted")}
              title={canEdit ? "Rename list" : undefined}
            >
              {list?.name ?? <Skeleton className="h-4 w-32" />}
            </button>
          )
        }
        crumbs={
          space ? (
            <>
              <Link href={href(`/s/${space.id}`)} className="hidden items-center gap-1.5 rounded px-1 py-0.5 text-[13px] text-ink-2 hover:bg-muted hover:text-ink sm:flex">
                <SpaceIcon name={space.icon} className={cn("size-3.5", `pastel-text-${asPastel(space.color)}`)} />
                {space.name}
              </Link>
              <ChevronRightIcon className="hidden size-3.5 text-ink-3 sm:block" />
            </>
          ) : null
        }
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" className={cn("hidden text-ink-3 sm:inline-flex", isFav && "text-ink")} aria-pressed={isFav} aria-label={isFav ? "Unpin from sidebar" : "Pin to sidebar"} onClick={() => toggleFavorite.mutate({ listId, on: !isFav })}>
              {isFav ? <PinFilledIcon /> : <PinIcon />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isFav ? "Unpin from sidebar" : "Pin to sidebar"}</TooltipContent>
        </Tooltip>

        <ToggleGroup type="single" value={view} onValueChange={(v) => v && setView(v as ViewType)} variant="outline" size="sm" className="ml-1">
          <ToggleGroupItem value="list" aria-label="List view">
            <ListIcon />
            <span className="hidden sm:inline">List</span>
          </ToggleGroupItem>
          <ToggleGroupItem value="board" aria-label="Board view">
            <KanbanIcon />
            <span className="hidden sm:inline">Board</span>
          </ToggleGroupItem>
          <ToggleGroupItem value="calendar" aria-label="Calendar view">
            <CalendarDaysIcon />
            <span className="hidden sm:inline">Calendar</span>
          </ToggleGroupItem>
        </ToggleGroup>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className={cn("text-ink-2", (mine || hideDone || categoryFilter !== "all" || groupBy !== "status") && "bg-action-soft text-action")}>
              <SlidersHorizontalIcon />
              <span className="hidden sm:inline">Filter</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="text-[11px] text-ink-3">Show</DropdownMenuLabel>
            <DropdownMenuCheckboxItem checked={mine} onCheckedChange={(v) => setMine(!!v)}>
              Only my tasks
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={hideDone} onCheckedChange={(v) => setHideDone(!!v)}>
              Hide completed
            </DropdownMenuCheckboxItem>
            {view === "list" ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-[11px] text-ink-3">Group by</DropdownMenuLabel>
                <DropdownMenuRadioGroup value={groupBy} onValueChange={(v) => setListGroupBy(listId, v as ListGroupBy)}>
                  <DropdownMenuRadioItem value="status">Status</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="category">Category</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[11px] text-ink-3">Category</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={categoryFilter} onValueChange={setCategoryFilter}>
              <DropdownMenuRadioItem value="all">All</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="none">No category</DropdownMenuRadioItem>
              {(categories ?? []).map((c) => (
                <DropdownMenuRadioItem key={c.id} value={c.id}>
                  <ColorDot color={c.color} className="mr-1" />
                  {c.name}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {canEdit ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" className="ml-1" onClick={() => openNewTask({ listId })}>
                <PlusIcon />
                New task
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              New task <Kbd>C</Kbd>
            </TooltipContent>
          </Tooltip>
        ) : null}
      </PageHeader>

      <div className={cn("min-h-0 flex-1", view === "list" ? "overflow-y-auto scrollbar-thin" : "overflow-hidden")}>
        {isPending || !list ? (
          <div className="flex flex-col gap-2 p-4">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : isError ? (
          <Empty className="h-full">
            <EmptyHeader>
              <EmptyTitle>Couldn’t load tasks</EmptyTitle>
              <EmptyDescription>Check your connection and try again.</EmptyDescription>
            </EmptyHeader>
            <Button variant="outline" onClick={() => refetch()}>
              Try again
            </Button>
          </Empty>
        ) : tasks && tasks.length === 0 && view !== "calendar" ? (
          <Empty className="h-full">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ListIcon />
              </EmptyMedia>
              <EmptyTitle>No tasks yet</EmptyTitle>
              <EmptyDescription>Add the first task to “{list.name}”. Press <Kbd>C</Kbd> anywhere to create one.</EmptyDescription>
            </EmptyHeader>
            {canEdit ? (
              <Button onClick={() => openNewTask({ listId })}>
                <PlusIcon /> New task
              </Button>
            ) : null}
          </Empty>
        ) : view === "board" ? (
          <BoardView tasks={filtered} listId={listId} />
        ) : view === "calendar" ? (
          <CalendarView tasks={filtered} listId={listId} />
        ) : (
          <ListView tasks={filtered} listId={listId} groupBy={groupBy} />
        )}
      </div>
    </>
  );
}
