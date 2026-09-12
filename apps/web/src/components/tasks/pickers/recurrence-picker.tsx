"use client";

import { useState } from "react";
import { CheckIcon, RepeatIcon } from "@/components/icons";
import { PickerShell, PickerItem, PickerTrigger } from "./picker-shell";
import { useUpdateTask } from "@/lib/queries/tasks";
import { RECURRENCE_PRESETS, parseRecurrence, recurrenceLabel, sameRecurrence, type Recurrence, type RecurrenceUnit } from "@/lib/recurrence";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { TaskRow } from "@/lib/types";
import { cn } from "@/lib/utils";

export function RecurrencePicker({
  task,
  value,
  onChange,
  trigger,
  className,
  disabled,
}: {
  task?: TaskRow;
  value?: Recurrence | null;
  onChange?: (r: Recurrence | null) => void;
  trigger?: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const updateTask = useUpdateTask();
  const current = task ? parseRecurrence(task.recurrence) : (value ?? null);
  const [customEvery, setCustomEvery] = useState<string>(current && !RECURRENCE_PRESETS.some((p) => sameRecurrence(p.value, current)) ? String(current.every) : "2");
  const [customUnit, setCustomUnit] = useState<RecurrenceUnit>(current?.unit ?? "week");

  const apply = (r: Recurrence | null) => {
    setOpen(false);
    if (task) updateTask.mutate({ id: task.id, recurrence: r });
    onChange?.(r);
  };

  return (
    <PickerShell
      open={open}
      onOpenChange={disabled ? undefined : setOpen}
      search={false}
      className="w-60"
      trigger={
        trigger ?? (
          <PickerTrigger className={className} placeholder={!current} disabled={disabled}>
            <RepeatIcon className="size-3.5" />
            <span>{recurrenceLabel(current)}</span>
          </PickerTrigger>
        )
      }
      footer={
        <form
          className="flex items-center gap-1.5 border-t p-2"
          onSubmit={(e) => {
            e.preventDefault();
            const n = Math.max(1, Math.min(365, Number(customEvery) || 1));
            apply({ every: n, unit: customUnit });
          }}
        >
          <span className="text-[12px] text-ink-2">Every</span>
          <Input type="number" min={1} max={365} value={customEvery} onChange={(e) => setCustomEvery(e.target.value)} className="h-7 w-14 px-1.5 text-center" aria-label="Interval" />
          <Select value={customUnit} onValueChange={(v) => setCustomUnit(v as RecurrenceUnit)}>
            <SelectTrigger size="sm" className="h-7 w-24" aria-label="Unit">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">days</SelectItem>
              <SelectItem value="week">weeks</SelectItem>
              <SelectItem value="month">months</SelectItem>
              <SelectItem value="year">years</SelectItem>
            </SelectContent>
          </Select>
          <Button type="submit" size="xs" variant="secondary">
            Set
          </Button>
        </form>
      }
    >
      <PickerItem value="none" onSelect={() => apply(null)}>
        <span className={cn("flex-1", !current && "font-medium")}>Doesn’t repeat</span>
        {!current ? <CheckIcon className="size-3.5 text-ink-2" /> : null}
      </PickerItem>
      {RECURRENCE_PRESETS.map((p) => {
        const on = sameRecurrence(p.value, current);
        return (
          <PickerItem key={p.label} value={p.label} onSelect={() => apply(p.value)}>
            <span className={cn("flex-1", on && "font-medium")}>{p.label}</span>
            {on ? <CheckIcon className="size-3.5 text-ink-2" /> : null}
          </PickerItem>
        );
      })}
    </PickerShell>
  );
}
