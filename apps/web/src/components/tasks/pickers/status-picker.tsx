"use client";

import { useState } from "react";
import { CheckIcon } from "@/components/icons";
import { PickerShell, PickerItem, PickerTrigger } from "./picker-shell";
import { StatusDot } from "@/components/tasks/status-dot";
import { useSpaceStatuses } from "@/hooks/use-space-statuses";
import { useUpdateTask } from "@/lib/queries/tasks";
import { cn } from "@/lib/utils";
import type { Status, TaskRow } from "@/lib/types";

export function StatusPicker({
  task,
  listId,
  value,
  onChange,
  trigger,
  className,
  disabled,
}: {
  task?: TaskRow;
  listId: string;
  value?: string | null;
  onChange?: (status: Status) => void;
  trigger?: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { statuses } = useSpaceStatuses(listId);
  const updateTask = useUpdateTask();
  const currentId = task ? task.status_id : value;
  const current = statuses.find((s) => s.id === currentId);

  const select = (s: Status) => {
    setOpen(false);
    if (task) updateTask.mutate({ id: task.id, status_id: s.id });
    onChange?.(s);
  };

  return (
    <PickerShell
      open={open}
      onOpenChange={disabled ? undefined : setOpen}
      placeholder="Change status…"
      search={statuses.length > 6}
      trigger={
        trigger ?? (
          <PickerTrigger className={className} placeholder={!current} disabled={disabled}>
            <StatusDot color={current?.color} category={current?.category} />
            <span className="truncate">{current?.name ?? "No status"}</span>
          </PickerTrigger>
        )
      }
    >
      {statuses.map((s) => (
        <PickerItem key={s.id} value={s.name} onSelect={() => select(s)}>
          <StatusDot color={s.color} category={s.category} />
          <span className={cn("flex-1", s.id === currentId && "font-medium")}>{s.name}</span>
          {s.id === currentId ? <CheckIcon className="size-3.5 text-ink-2" /> : null}
        </PickerItem>
      ))}
    </PickerShell>
  );
}
