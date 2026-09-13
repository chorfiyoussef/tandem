"use client";

import { useEffect, useRef, useState } from "react";
import { useUpdateTask } from "@/lib/queries/tasks";
import type { TaskRow } from "@/lib/types";
import { cn } from "@/lib/utils";

export function TaskTitle({ task, disabled }: { task: TaskRow; disabled?: boolean }) {
  const [value, setValue] = useState(task.title);
  const ref = useRef<HTMLTextAreaElement>(null);
  const updateTask = useUpdateTask();

  useEffect(() => {
    if (document.activeElement !== ref.current) setValue(task.title);
  }, [task.title]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  const save = () => {
    const v = value.trim();
    if (!v) return setValue(task.title);
    if (v !== task.title) updateTask.mutate({ id: task.id, title: v });
  };

  return (
    <textarea
      ref={ref}
      value={value}
      rows={1}
      disabled={disabled}
      aria-label="Task title"
      onChange={(e) => setValue(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          (e.target as HTMLTextAreaElement).blur();
        }
        if (e.key === "Escape") {
          setValue(task.title);
          (e.target as HTMLTextAreaElement).blur();
        }
      }}
      className={cn(
        "w-full resize-none overflow-hidden bg-transparent text-[22px] font-semibold leading-tight tracking-[-0.015em] text-ink outline-none placeholder:text-ink-3",
        task.completed_at && "text-ink-2",
      )}
      placeholder="Task name"
    />
  );
}
