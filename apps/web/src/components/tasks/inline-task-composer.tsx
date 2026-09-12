"use client";

import { useEffect, useRef, useState } from "react";
import { PlusIcon } from "@/components/icons";
import { toast } from "sonner";
import { useCreateTask } from "@/lib/queries/tasks";
import { cn } from "@/lib/utils";

/** The "+ Add task" row that turns into an input. Enter adds and stays open; Esc closes. */
export function InlineTaskComposer({
  listId,
  statusId,
  categoryId,
  parentId,
  className,
  label = "Add task",
  autoOpen = false,
  onClose,
}: {
  listId: string;
  statusId?: string | null;
  categoryId?: string | null;
  parentId?: string | null;
  className?: string;
  label?: string;
  autoOpen?: boolean;
  onClose?: () => void;
}) {
  const [open, setOpen] = useState(autoOpen);
  const [title, setTitle] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  const createTask = useCreateTask();

  useEffect(() => {
    if (open) ref.current?.focus();
  }, [open]);

  const close = () => {
    setOpen(false);
    setTitle("");
    onClose?.();
  };

  const submit = async () => {
    const t = title.trim();
    if (!t) return close();
    setTitle("");
    try {
      await createTask.mutateAsync({ list_id: listId, title: t, status_id: statusId ?? undefined, category_id: categoryId ?? undefined, parent_id: parentId ?? undefined });
    } catch {
      toast.error("Couldn't add the task.");
      setTitle(t);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex h-8 w-full items-center gap-2 pl-[3.25rem] pr-3 text-[13px] text-ink-3 transition-colors hover:text-ink-2",
          className,
        )}
      >
        <PlusIcon className="size-3.5" />
        {label}
      </button>
    );
  }

  return (
    <div className={cn("flex h-9 items-center gap-2 pl-[3.25rem] pr-3 hairline-b", className)}>
      <span className="size-4 shrink-0 rounded-full" style={{ boxShadow: "inset 0 0 0 1.5px var(--hairline-strong)" }} aria-hidden />
      <input
        ref={ref}
        value={title}
        placeholder="Task name"
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          } else if (e.key === "Escape") {
            e.preventDefault();
            close();
          }
        }}
        onBlur={() => {
          if (title.trim()) submit();
          else close();
        }}
        className="min-w-0 flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-3"
      />
    </div>
  );
}
