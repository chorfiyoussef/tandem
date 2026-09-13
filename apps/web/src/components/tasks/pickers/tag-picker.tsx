"use client";

import { useState } from "react";
import { CheckIcon, PlusIcon, TagIcon } from "@/components/icons";
import { toast } from "sonner";
import { PASTEL_COLORS, type PastelColor } from "@tandem/shared";
import { PickerShell, PickerItem, PickerTrigger } from "./picker-shell";
import { TagChip } from "@/components/tasks/tag-chip";
import { ColorDot } from "@/components/common/pastel";
import { useWorkspace } from "@/components/workspace-provider";
import { useCreateTag, useTags } from "@/lib/queries/workspace";
import { useSetTags } from "@/lib/queries/tasks";
import type { Tag, TaskRow } from "@/lib/types";
import { cn } from "@/lib/utils";

function nextColor(existing: Tag[]): PastelColor {
  const used = new Map<string, number>();
  for (const t of existing) used.set(t.color, (used.get(t.color) ?? 0) + 1);
  const candidates = PASTEL_COLORS.filter((c) => c !== "gray");
  return candidates.reduce((best, c) => ((used.get(c) ?? 0) < (used.get(best) ?? 0) ? c : best), candidates[0]);
}

export function TagPicker({
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
  const { workspace } = useWorkspace();
  const { data: tags } = useTags(workspace.id);
  const createTag = useCreateTag(workspace.id);
  const setTags = useSetTags();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = task ? task.task_tags.map((t) => t.tag_id) : (value ?? []);
  const all = tags ?? [];

  const apply = (next: string[]) => {
    if (task) setTags.mutate({ task, tagIds: next, tags: all });
    onChange?.(next);
  };
  const toggle = (id: string) => apply(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  const canCreate = query.trim().length > 0 && !all.some((t) => t.name.toLowerCase() === query.trim().toLowerCase());

  const create = async () => {
    try {
      const tag = await createTag.mutateAsync({ name: query.trim(), color: nextColor(all) });
      setQuery("");
      apply([...selected, tag.id]);
    } catch {
      toast.error("Couldn't create the tag.");
    }
  };

  const selectedTags = selected.map((id) => all.find((t) => t.id === id)).filter((t): t is Tag => !!t);

  return (
    <PickerShell
      open={open}
      onOpenChange={disabled ? undefined : (o) => { setOpen(o); if (!o) setQuery(""); }}
      placeholder="Add tags…"
      emptyText={canCreate ? null : all.length === 0 ? "No tags yet. Type a name to create one." : "No matching tags."}
      trigger={
        trigger ?? (
          <PickerTrigger className={cn("h-auto min-h-7 flex-wrap py-1", className)} placeholder={selected.length === 0} disabled={disabled}>
            {selected.length === 0 ? (
              <>
                <TagIcon className="size-3.5" />
                {!compact ? <span>No tags</span> : null}
              </>
            ) : (
              selectedTags.map((t) => <TagChip key={t.id} name={t.name} color={t.color} />)
            )}
          </PickerTrigger>
        )
      }
      footer={
        canCreate ? (
          <div className="border-t p-1">
            <button
              type="button"
              onClick={create}
              className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-[14px] hover:bg-muted"
            >
              <PlusIcon className="size-3.5 text-ink-2" />
              Create “{query.trim()}”
            </button>
          </div>
        ) : null
      }
    >
      <CommandInputBridge value={query} onChange={setQuery} />
      {all.map((t) => {
        const on = selected.includes(t.id);
        return (
          <PickerItem key={t.id} value={t.name} onSelect={() => toggle(t.id)}>
            <ColorDot color={t.color} />
            <span className={cn("flex-1 truncate", on && "font-medium")}>{t.name}</span>
            {on ? <CheckIcon className="size-3.5 text-ink-2" /> : null}
          </PickerItem>
        );
      })}
    </PickerShell>
  );
}

/**
 * cmdk owns the search input inside PickerShell; this invisible bridge mirrors
 * its value so we can offer "Create …" for unmatched queries.
 */
import { useCommandState } from "cmdk";
import { useEffect } from "react";
function CommandInputBridge({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const search = useCommandState((s) => s.search);
  useEffect(() => {
    if (search !== value) onChange(search);
  }, [search, value, onChange]);
  return null;
}
