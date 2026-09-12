"use client";

import { useState } from "react";
import { CheckIcon, UserPlusIcon } from "@/components/icons";
import { PickerShell, PickerItem, PickerTrigger } from "./picker-shell";
import { UserAvatar, displayName } from "@/components/common/user-avatar";
import { AvatarGroup } from "@/components/ui/avatar";
import { useWorkspace } from "@/components/workspace-provider";
import { useMembers } from "@/lib/queries/workspace";
import { useSetAssignees } from "@/lib/queries/tasks";
import type { ProfileLite, TaskRow } from "@/lib/types";
import { cn } from "@/lib/utils";

export function AssigneeAvatars({ users, size = "sm", max = 3 }: { users: (ProfileLite | null)[]; size?: "xs" | "sm" | "md"; max?: number }) {
  const list = users.filter((u): u is ProfileLite => !!u);
  if (list.length === 0) return null;
  const shown = list.slice(0, max);
  const rest = list.length - shown.length;
  return (
    <AvatarGroup className="-space-x-1">
      {shown.map((u) => (
        <UserAvatar key={u.id} user={u} size={size} className="ring-[1.5px] ring-surface" />
      ))}
      {rest > 0 ? (
        <span className={cn("flex items-center justify-center rounded-full bg-muted font-medium text-ink-2 ring-2 ring-surface", size === "xs" ? "size-3.5 text-[7px]" : size === "sm" ? "size-4 text-[8px]" : "size-5 text-[9px]")}>
          +{rest}
        </span>
      ) : null}
    </AvatarGroup>
  );
}

export function AssigneePicker({
  task,
  value,
  onChange,
  trigger,
  className,
  disabled,
  compact,
}: {
  task?: TaskRow;
  value?: string[];
  onChange?: (ids: string[]) => void;
  trigger?: React.ReactNode;
  className?: string;
  disabled?: boolean;
  compact?: boolean;
}) {
  const { workspace, userId } = useWorkspace();
  const { data: members } = useMembers(workspace.id);
  const setAssignees = useSetAssignees();
  const [open, setOpen] = useState(false);
  const selected = task ? task.task_assignees.map((a) => a.user_id) : (value ?? []);
  const profiles = (members ?? []).map((m) => m.profiles);
  const sorted = [...profiles].sort((a, b) => (a.id === userId ? -1 : b.id === userId ? 1 : displayName(a).localeCompare(displayName(b))));

  const toggle = (id: string) => {
    const next = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
    if (task) setAssignees.mutate({ task, userIds: next, members: profiles });
    onChange?.(next);
  };

  const selectedProfiles = selected.map((id) => profiles.find((p) => p.id === id) ?? null);

  return (
    <PickerShell
      open={open}
      onOpenChange={disabled ? undefined : setOpen}
      placeholder="Assign to…"
      emptyText="No one matches."
      trigger={
        trigger ?? (
          <PickerTrigger className={className} placeholder={selected.length === 0} disabled={disabled}>
            {selected.length === 0 ? (
              <>
                <UserPlusIcon className="size-3.5" />
                {!compact ? <span>Unassigned</span> : null}
              </>
            ) : (
              <>
                <AssigneeAvatars users={selectedProfiles} />
                {!compact ? (
                  <span className="truncate">
                    {selected.length === 1 ? displayName(selectedProfiles[0]) : `${selected.length} people`}
                  </span>
                ) : null}
              </>
            )}
          </PickerTrigger>
        )
      }
    >
      {sorted.map((p) => {
        const on = selected.includes(p.id);
        return (
          <PickerItem key={p.id} value={`${displayName(p)} ${p.email}`} onSelect={() => toggle(p.id)}>
            <UserAvatar user={p} size="md" />
            <span className={cn("flex-1 truncate", on && "font-medium")}>
              {displayName(p)}
              {p.id === userId ? <span className="text-ink-3"> (you)</span> : null}
            </span>
            {on ? <CheckIcon className="size-3.5 text-ink-2" /> : null}
          </PickerItem>
        );
      })}
    </PickerShell>
  );
}
