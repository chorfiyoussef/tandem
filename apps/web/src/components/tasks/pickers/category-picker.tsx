"use client";

import { useEffect, useState } from "react";
import { useCommandState } from "cmdk";
import { toast } from "sonner";
import { PASTEL_COLORS, type PastelColor } from "@tandem/shared";
import { CheckIcon, PlusIcon, ShapesIcon } from "@/components/icons";
import { PickerShell, PickerItem, PickerTrigger } from "./picker-shell";
import { CategoryChip } from "@/components/tasks/category-chip";
import { ColorDot } from "@/components/common/pastel";
import { useWorkspace } from "@/components/workspace-provider";
import { useCategories, useCreateCategory } from "@/lib/queries/workspace";
import { useUpdateTask } from "@/lib/queries/tasks";
import type { Category, TaskRow } from "@/lib/types";
import { cn } from "@/lib/utils";

function nextColor(existing: Category[]): PastelColor {
  const used = new Map<string, number>();
  for (const c of existing) used.set(c.color, (used.get(c.color) ?? 0) + 1);
  const candidates = PASTEL_COLORS.filter((c) => c !== "gray");
  return candidates.reduce((best, c) => ((used.get(c) ?? 0) < (used.get(best) ?? 0) ? c : best), candidates[0]);
}

/** Single-select. Pass `task` to update it directly, or `value`/`onChange` for forms. */
export function CategoryPicker({
  task,
  value,
  onChange,
  trigger,
  className,
  disabled,
  compact,
}: {
  task?: TaskRow;
  value?: string | null;
  onChange?: (id: string | null) => void;
  trigger?: React.ReactNode;
  className?: string;
  disabled?: boolean;
  compact?: boolean;
}) {
  const { workspace } = useWorkspace();
  const { data: categories } = useCategories(workspace.id);
  const createCategory = useCreateCategory(workspace.id);
  const updateTask = useUpdateTask();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const all = categories ?? [];
  const currentId = task ? task.category_id : (value ?? null);
  const current = all.find((c) => c.id === currentId) ?? (task?.categories?.id === currentId ? task.categories : null);

  const apply = (id: string | null) => {
    setOpen(false);
    if (task) updateTask.mutate({ id: task.id, category_id: id });
    onChange?.(id);
  };

  const canCreate = query.trim().length > 0 && !all.some((c) => c.name.toLowerCase() === query.trim().toLowerCase());
  const create = async () => {
    try {
      const cat = await createCategory.mutateAsync({ name: query.trim(), color: nextColor(all) });
      setQuery("");
      apply(cat.id);
    } catch {
      toast.error("Couldn’t create the category.");
    }
  };

  return (
    <PickerShell
      open={open}
      onOpenChange={disabled ? undefined : (o) => { setOpen(o); if (!o) setQuery(""); }}
      placeholder="Set category…"
      emptyText={canCreate ? null : all.length === 0 ? "No categories yet. Type a name to create one." : "No matching categories."}
      trigger={
        trigger ?? (
          <PickerTrigger className={className} placeholder={!current} disabled={disabled}>
            {current ? (
              <CategoryChip category={current} />
            ) : (
              <>
                <ShapesIcon className="size-3.5" />
                {!compact ? <span>No category</span> : null}
              </>
            )}
          </PickerTrigger>
        )
      }
      footer={
        canCreate ? (
          <div className="border-t p-1">
            <button type="button" onClick={create} className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-[13px] hover:bg-muted">
              <PlusIcon className="size-3.5 text-ink-2" />
              Create “{query.trim()}”
            </button>
          </div>
        ) : null
      }
    >
      <CommandInputBridge value={query} onChange={setQuery} />
      {current ? (
        <PickerItem value="__none" onSelect={() => apply(null)}>
          <span className="size-2.5 rounded-full" style={{ boxShadow: "inset 0 0 0 1.5px var(--hairline-strong)" }} aria-hidden />
          <span className="flex-1 text-ink-2">No category</span>
        </PickerItem>
      ) : null}
      {all.map((c) => {
        const on = c.id === currentId;
        return (
          <PickerItem key={c.id} value={c.name} onSelect={() => apply(on ? null : c.id)}>
            <ColorDot color={c.color} />
            <span className={cn("flex-1 truncate", on && "font-medium")}>{c.name}</span>
            {on ? <CheckIcon className="size-3.5 text-ink-2" /> : null}
          </PickerItem>
        );
      })}
    </PickerShell>
  );
}

function CommandInputBridge({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const search = useCommandState((s) => s.search);
  useEffect(() => {
    if (search !== value) onChange(search);
  }, [search, value, onChange]);
  return null;
}
