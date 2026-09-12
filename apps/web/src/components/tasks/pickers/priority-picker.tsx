"use client";

import { useState } from "react";
import { CheckIcon } from "@/components/icons";
import { PRIORITIES, PRIORITY_META, type Priority } from "@tandem/shared";
import { PickerShell, PickerItem, PickerTrigger } from "./picker-shell";
import { PriorityIcon } from "@/components/tasks/priority-icon";
import { useUpdateTask } from "@/lib/queries/tasks";
import type { TaskRow } from "@/lib/types";
import { cn } from "@/lib/utils";

const ORDER: Priority[] = ["urgent", "high", "normal", "low", "none"];

export function PriorityPicker({
  task,
  value,
  onChange,
  trigger,
  className,
  disabled,
}: {
  task?: TaskRow;
  value?: Priority;
  onChange?: (p: Priority) => void;
  trigger?: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const updateTask = useUpdateTask();
  const current: Priority = (task ? task.priority : value) ?? "none";

  const select = (p: Priority) => {
    setOpen(false);
    if (task) updateTask.mutate({ id: task.id, priority: p });
    onChange?.(p);
  };

  return (
    <PickerShell
      open={open}
      onOpenChange={disabled ? undefined : setOpen}
      search={false}
      className="w-44"
      trigger={
        trigger ?? (
          <PickerTrigger className={className} placeholder={current === "none"} disabled={disabled}>
            <PriorityIcon priority={current} />
            <span>{PRIORITY_META[current].label}</span>
          </PickerTrigger>
        )
      }
    >
      {ORDER.filter((p) => PRIORITIES.includes(p)).map((p) => (
        <PickerItem key={p} value={p} onSelect={() => select(p)}>
          <PriorityIcon priority={p} />
          <span className={cn("flex-1", p === current && "font-medium")}>{PRIORITY_META[p].label}</span>
          {p === current ? <CheckIcon className="size-3.5 text-ink-2" /> : null}
        </PickerItem>
      ))}
    </PickerShell>
  );
}
