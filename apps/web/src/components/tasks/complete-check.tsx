"use client";

import { CheckIcon } from "@/components/icons";
import { motion } from "motion/react";
import { useSpaceStatuses } from "@/hooks/use-space-statuses";
import { useUpdateTask } from "@/lib/queries/tasks";
import type { TaskRow } from "@/lib/types";
import { cn } from "@/lib/utils";

/** The one-click "done" control. Completing moves the task to the space's first done status. */
export function CompleteCheck({ task, className, size = 16 }: { task: TaskRow; className?: string; size?: number }) {
  const { firstDone, firstTodo } = useSpaceStatuses(task.list_id);
  const updateTask = useUpdateTask();
  const done = !!task.completed_at;

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const target = done ? firstTodo : firstDone;
    if (!target) return;
    updateTask.mutate({ id: task.id, status_id: target.id, completed_at: done ? null : new Date().toISOString() });
  };

  return (
    <motion.button
      type="button"
      onClick={toggle}
      aria-label={done ? "Mark as not done" : "Mark as done"}
      aria-pressed={done}
      whileTap={{ scale: 0.85 }}
      className={cn(
        "group/check flex shrink-0 items-center justify-center rounded-full transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
        done ? "pastel-dot-mint text-white" : "text-transparent hover:text-ink-3",
        className,
      )}
      style={{
        width: size,
        height: size,
        boxShadow: done ? undefined : "inset 0 0 0 1.5px var(--hairline-strong)",
      }}
    >
      <motion.span initial={false} animate={{ scale: done ? 1 : 0.9 }} className="flex">
        <CheckIcon style={{ width: size * 0.62, height: size * 0.62 }} strokeWidth={3.5} />
      </motion.span>
    </motion.button>
  );
}
