"use client";

import { useMemo } from "react";
import { format, differenceInCalendarDays, startOfDay } from "date-fns";
import { PlusIcon, SunIcon } from "@/components/icons";
import { PageHeader } from "@/components/shell/page-header";
import { useWorkspace } from "@/components/workspace-provider";
import { useMyTasks } from "@/lib/queries/tasks";
import { useLists } from "@/lib/queries/workspace";
import { useUi } from "@/stores/ui";
import { TaskRow } from "@/components/tasks/task-row";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Skeleton } from "@/components/ui/skeleton";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { greeting, parseDate } from "@/lib/dates";
import type { TaskRow as TaskRowType } from "@/lib/types";
import { cn } from "@/lib/utils";

type Bucket = { key: string; title: string; tasks: TaskRowType[]; tone?: "overdue" | "today" };

export function HomePage() {
  const { workspace, userId, profile, canEdit } = useWorkspace();
  const { data: tasks, isPending } = useMyTasks(workspace.id, userId);
  const { data: lists } = useLists(workspace.id);
  const openNewTask = useUi((s) => s.openNewTask);

  const buckets = useMemo<Bucket[]>(() => {
    const today = startOfDay(new Date());
    const open = (tasks ?? []).filter((t) => !t.completed_at);
    const b: Record<string, TaskRowType[]> = { overdue: [], today: [], tomorrow: [], week: [], later: [], none: [] };
    for (const t of open) {
      const d = parseDate(t.due_date);
      if (!d) {
        b.none.push(t);
        continue;
      }
      const diff = differenceInCalendarDays(d, today);
      if (diff < 0) b.overdue.push(t);
      else if (diff === 0) b.today.push(t);
      else if (diff === 1) b.tomorrow.push(t);
      else if (diff < 7) b.week.push(t);
      else b.later.push(t);
    }
    const done = (tasks ?? []).filter((t) => t.completed_at).slice(0, 8);
    return [
      { key: "overdue", title: "Overdue", tasks: b.overdue, tone: "overdue" as const },
      { key: "today", title: "Today", tasks: b.today, tone: "today" as const },
      { key: "tomorrow", title: "Tomorrow", tasks: b.tomorrow },
      { key: "week", title: "This week", tasks: b.week },
      { key: "later", title: "Later", tasks: b.later },
      { key: "none", title: "No due date", tasks: b.none },
      { key: "done", title: "Recently completed", tasks: done },
    ].filter((x) => x.tasks.length > 0);
  }, [tasks]);

  const openCount = (tasks ?? []).filter((t) => !t.completed_at).length;
  const listName = (id: string) => lists?.find((l) => l.id === id)?.name;

  return (
    <>
      <PageHeader title="Home">
        {canEdit ? (
          <Button size="sm" onClick={() => openNewTask()}>
            <PlusIcon />
            New task
          </Button>
        ) : null}
      </PageHeader>
      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">
        <div className="mx-auto w-full max-w-4xl px-4 pb-24 pt-8 md:px-6">
          <div className="mb-6 px-3">
            <p className="text-[12px] text-ink-3">{format(new Date(), "EEEE, MMMM d")}</p>
            <h2 className="mt-0.5 text-[22px] font-semibold tracking-[-0.02em] text-ink">{greeting(profile.full_name)}</h2>
            <p className="mt-1 text-[13px] text-ink-2">
              {isPending ? "Loading your work…" : openCount === 0 ? "Nothing is waiting on you." : openCount === 1 ? "One task is waiting on you." : `${openCount} tasks are waiting on you.`}
            </p>
          </div>

          {isPending ? (
            <div className="flex flex-col gap-2 px-3">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-2/3" />
            </div>
          ) : buckets.length === 0 ? (
            <Empty className="border-0">
              <EmptyHeader>
                <EmptyMedia variant="icon" className="pastel-butter">
                  <SunIcon />
                </EmptyMedia>
                <EmptyTitle>All clear</EmptyTitle>
                <EmptyDescription>
                  Tasks assigned to you show up here, sorted by when they’re due. Press <Kbd>C</Kbd> to add one.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="flex flex-col gap-6">
              {buckets.map((b) => (
                <section key={b.key}>
                  <header className="flex items-baseline gap-2 px-3 pb-1">
                    <h3 className={cn("text-[13px] font-semibold", b.tone === "overdue" && "text-destructive", b.key === "done" && "text-ink-2")}>{b.title}</h3>
                    <span className="tabular text-[12px] text-ink-3">{b.tasks.length}</span>
                  </header>
                  <div className="flex flex-col">
                    {b.tasks.map((t) => (
                      <TaskRow key={t.id} task={t} showStatus listName={listName(t.list_id)} className="rounded-lg hairline-b" />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
