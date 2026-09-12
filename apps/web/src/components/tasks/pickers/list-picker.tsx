"use client";

import { useState } from "react";
import { CheckIcon, ListIcon } from "@/components/icons";
import { PickerShell, PickerItem, PickerTrigger } from "./picker-shell";
import { SpaceIcon } from "@/components/common/space-icon";
import { asPastel } from "@/components/common/pastel";
import { useWorkspace } from "@/components/workspace-provider";
import { useLists, useSpaces } from "@/lib/queries/workspace";
import { useUpdateTask } from "@/lib/queries/tasks";
import type { TaskRow } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ListPicker({
  task,
  value,
  onChange,
  trigger,
  className,
  disabled,
}: {
  task?: TaskRow;
  value?: string | null;
  onChange?: (listId: string) => void;
  trigger?: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  const { workspace } = useWorkspace();
  const { data: lists } = useLists(workspace.id);
  const { data: spaces } = useSpaces(workspace.id);
  const updateTask = useUpdateTask();
  const [open, setOpen] = useState(false);
  const currentId = task ? task.list_id : value;
  const current = lists?.find((l) => l.id === currentId);
  const currentSpace = spaces?.find((s) => s.id === current?.space_id);

  const select = (id: string) => {
    setOpen(false);
    if (id === currentId) return;
    if (task) {
      const targetSpace = lists?.find((l) => l.id === id)?.space_id;
      // Moving across spaces: statuses differ, so let the database pick the first one.
      updateTask.mutate({ id: task.id, list_id: id, ...(targetSpace !== currentSpace?.id ? { status_id: null } : {}) });
    }
    onChange?.(id);
  };

  return (
    <PickerShell
      open={open}
      onOpenChange={disabled ? undefined : setOpen}
      placeholder="Move to list…"
      trigger={
        trigger ?? (
          <PickerTrigger className={className} placeholder={!current} disabled={disabled}>
            {currentSpace ? <SpaceIcon name={currentSpace.icon} className={cn("size-3.5", `pastel-text-${asPastel(currentSpace.color)}`)} /> : <ListIcon className="size-3.5" />}
            <span className="truncate">{current ? current.name : "Choose a list"}</span>
          </PickerTrigger>
        )
      }
    >
      {(spaces ?? []).map((space) =>
        (lists ?? [])
          .filter((l) => l.space_id === space.id)
          .map((l) => (
            <PickerItem key={l.id} value={`${space.name} ${l.name}`} onSelect={() => select(l.id)}>
              <SpaceIcon name={space.icon} className={cn("size-3.5", `pastel-text-${asPastel(space.color)}`)} />
              <span className="text-ink-3">{space.name}</span>
              <span className={cn("flex-1 truncate", l.id === currentId && "font-medium")}>{l.name}</span>
              {l.id === currentId ? <CheckIcon className="size-3.5 text-ink-2" /> : null}
            </PickerItem>
          )),
      )}
    </PickerShell>
  );
}
