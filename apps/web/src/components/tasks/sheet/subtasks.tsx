"use client";

import { useState } from "react";
import { PlusIcon } from "@/components/icons";
import { useSubtasks } from "@/lib/queries/tasks";
import { useWorkspace } from "@/components/workspace-provider";
import { useOpenTask } from "@/hooks/use-open-task";
import { CompleteCheck } from "../complete-check";
import { AssigneeAvatars } from "../pickers/assignee-picker";
import { DueLabel } from "../due-label";
import { InlineTaskComposer } from "../inline-task-composer";
import { Button } from "@/components/ui/button";
import type { TaskRow } from "@/lib/types";
import { cn } from "@/lib/utils";

export function Subtasks({ task }: { task: TaskRow }) {
  const { canEdit } = useWorkspace();
  const { data: subtasks } = useSubtasks(task.id);
  const openTask = useOpenTask();
  const [adding, setAdding] = useState(false);
  const items = subtasks ?? [];
  const done = items.filter((s) => s.completed_at).length;

  if (items.length === 0 && !adding) {
    if (!canEdit) return null;
    return (
      <Button variant="ghost" size="sm" className="-ml-2 text-ink-2" onClick={() => setAdding(true)}>
        <PlusIcon /> Add subtask
      </Button>
    );
  }

  return (
    <section className="flex flex-col">
      <header className="flex items-center gap-2 pb-1">
        <h3 className="text-[13px] font-medium text-ink-2">Subtasks</h3>
        {items.length > 0 ? (
          <span className="tabular text-[13px] text-ink-3">
            {done}/{items.length}
          </span>
        ) : null}
      </header>
      {items.length > 0 ? (
        <div className="mb-1 h-1 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full pastel-dot-mint transition-[width] duration-300" style={{ width: `${(done / items.length) * 100}%` }} />
        </div>
      ) : null}
      <div className="-mx-2 flex flex-col">
        {items.map((s) => (
          <div
            key={s.id}
            role="button"
            tabIndex={0}
            onClick={() => openTask(s.id)}
            onKeyDown={(e) => e.key === "Enter" && openTask(s.id)}
            className="flex h-8 items-center gap-2 rounded-md px-2 text-[14px] outline-none hover:bg-muted/60 focus-visible:bg-muted/60"
          >
            <CompleteCheck task={s} size={15} />
            <span className={cn("min-w-0 flex-1 truncate", s.completed_at && "text-ink-3 line-through")}>{s.title}</span>
            <DueLabel date={s.due_date} completed={!!s.completed_at} showIcon={false} className="text-[12px]" />
            <AssigneeAvatars users={s.task_assignees.map((a) => a.profiles)} size="xs" />
          </div>
        ))}
        {canEdit ? (
          <InlineTaskComposer listId={task.list_id} parentId={task.id} statusId={null} label="Add subtask" autoOpen={adding} onClose={() => setAdding(false)} className="px-2" key={adding ? "open" : "closed"} />
        ) : null}
      </div>
    </section>
  );
}
