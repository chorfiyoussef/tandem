"use client";

import { useState } from "react";
import { addDays, nextMonday, startOfDay } from "date-fns";
import { CalendarIcon, XIcon } from "@/components/icons";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { PickerTrigger } from "./picker-shell";
import { DueLabel } from "@/components/tasks/due-label";
import { parseDate, toDateString } from "@/lib/dates";
import { useUpdateTask } from "@/lib/queries/tasks";
import type { TaskRow } from "@/lib/types";
import { cn } from "@/lib/utils";

export function DueDatePicker({
  task,
  value,
  onChange,
  trigger,
  className,
  disabled,
  align = "start",
}: {
  task?: TaskRow;
  value?: string | null;
  onChange?: (date: string | null) => void;
  trigger?: React.ReactNode;
  className?: string;
  disabled?: boolean;
  align?: "start" | "end" | "center";
}) {
  const [open, setOpen] = useState(false);
  const updateTask = useUpdateTask();
  const current = task ? task.due_date : (value ?? null);
  const selected = parseDate(current) ?? undefined;

  const set = (d: Date | null) => {
    const next = d ? toDateString(d) : null;
    setOpen(false);
    if (task) updateTask.mutate({ id: task.id, due_date: next });
    onChange?.(next);
  };

  const today = startOfDay(new Date());
  const quick: { label: string; date: Date | null }[] = [
    { label: "Today", date: today },
    { label: "Tomorrow", date: addDays(today, 1) },
    { label: "Next week", date: nextMonday(today) },
  ];

  return (
    <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
      <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
        {trigger ?? (
          <PickerTrigger className={className} placeholder={!current} disabled={disabled}>
            {current ? (
              <DueLabel date={current} completed={!!task?.completed_at} className="text-[14px]" />
            ) : (
              <>
                <CalendarIcon className="size-3.5" />
                <span>No due date</span>
              </>
            )}
          </PickerTrigger>
        )}
      </PopoverTrigger>
      <PopoverContent align={align} className="w-auto p-0 shadow-float" onClick={(e) => e.stopPropagation()}>
        <div className="flex gap-1 p-2 pb-0">
          {quick.map((q) => (
            <Button key={q.label} size="xs" variant="secondary" onClick={() => set(q.date)}>
              {q.label}
            </Button>
          ))}
          {current ? (
            <Button size="xs" variant="ghost" className={cn("ml-auto text-ink-2")} onClick={() => set(null)}>
              <XIcon /> Clear
            </Button>
          ) : null}
        </div>
        <Calendar mode="single" selected={selected} defaultMonth={selected} onSelect={(d) => set(d ?? null)} />
      </PopoverContent>
    </Popover>
  );
}
