"use client";

import { useCallback, useEffect, useRef } from "react";
import { RichEditor, type JSONContent } from "@/components/editor/rich-editor";
import { useUpdateTask } from "@/lib/queries/tasks";
import type { TaskRow } from "@/lib/types";

export function TaskDescription({ task, disabled }: { task: TaskRow; disabled?: boolean }) {
  const updateTask = useUpdateTask();
  const pending = useRef<{ doc: JSONContent; text: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const p = pending.current;
    pending.current = null;
    if (!p) return;
    if (JSON.stringify(p.doc) === JSON.stringify(task.description)) return;
    updateTask.mutate({ id: task.id, description: p.doc, description_text: p.text });
  }, [task.id, task.description, updateTask]);

  useEffect(() => () => flush(), [flush]);

  return (
    <RichEditor
      value={task.description as JSONContent | null}
      editable={!disabled}
      placeholder="Add details, links, or a checklist…"
      minHeight={56}
      onChange={(doc, text) => {
        pending.current = { doc, text };
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(flush, 900);
      }}
      onBlur={flush}
    />
  );
}
