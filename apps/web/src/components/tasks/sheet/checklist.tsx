"use client";

import { useState } from "react";
import { PlusIcon, XIcon } from "@/components/icons";
import { useChecklist, useChecklistMutations } from "@/lib/queries/task-details";
import { useWorkspace } from "@/components/workspace-provider";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { InlineNameInput } from "@/components/common/inline-name-input";
import type { TaskRow } from "@/lib/types";
import { cn } from "@/lib/utils";

export function Checklist({ task }: { task: TaskRow }) {
  const { canEdit } = useWorkspace();
  const { data: items } = useChecklist(task.id);
  const { add, toggle, rename, remove } = useChecklistMutations(task.id);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const list = items ?? [];
  const done = list.filter((i) => i.done).length;

  if (list.length === 0 && !adding) {
    if (!canEdit) return null;
    return (
      <Button variant="ghost" size="sm" className="-ml-2 text-ink-2" onClick={() => setAdding(true)}>
        <PlusIcon /> Add checklist
      </Button>
    );
  }

  return (
    <section className="flex flex-col">
      <header className="flex items-center gap-2 pb-1">
        <h3 className="text-[12px] font-medium text-ink-2">Checklist</h3>
        {list.length > 0 ? (
          <span className="tabular text-[12px] text-ink-3">
            {done}/{list.length}
          </span>
        ) : null}
      </header>
      <div className="-mx-2 flex flex-col">
        {list.map((item) => (
          <div key={item.id} className="group/item flex h-8 items-center gap-2.5 rounded-md px-2 text-[13px] hover:bg-muted/60">
            <Checkbox checked={item.done} disabled={!canEdit} onCheckedChange={(v) => toggle.mutate({ id: item.id, done: v === true })} aria-label={item.title} />
            {editing === item.id ? (
              <InlineNameInput
                defaultValue={item.title}
                className="h-6 flex-1"
                onCancel={() => setEditing(null)}
                onSubmit={(title) => {
                  setEditing(null);
                  if (title !== item.title) rename.mutate({ id: item.id, title });
                }}
              />
            ) : (
              <button
                type="button"
                disabled={!canEdit}
                onClick={() => setEditing(item.id)}
                className={cn("min-w-0 flex-1 truncate text-left", item.done && "text-ink-3 line-through")}
              >
                {item.title}
              </button>
            )}
            {canEdit ? (
              <button type="button" onClick={() => remove.mutate(item.id)} aria-label="Remove item" className="text-ink-3 opacity-0 hover:text-ink group-hover/item:opacity-100">
                <XIcon className="size-3.5" />
              </button>
            ) : null}
          </div>
        ))}
        {adding ? (
          <div className="flex h-8 items-center gap-2.5 px-2">
            <span className="size-4 rounded-[4px]" style={{ boxShadow: "inset 0 0 0 1.5px var(--hairline-strong)" }} aria-hidden />
            <InlineNameInput
              placeholder="Checklist item"
              className="h-6 flex-1"
              onCancel={() => setAdding(false)}
              onSubmit={(title) => {
                add.mutate(title);
                setAdding(false);
                setTimeout(() => setAdding(true), 0);
              }}
            />
          </div>
        ) : canEdit ? (
          <div className="px-2 pt-1">
            <button type="button" onClick={() => setAdding(true)} className="inline-flex h-7 items-center gap-1.5 rounded-md bg-muted/70 px-2 text-[12.5px] font-medium text-ink-2 transition-colors hover:bg-muted hover:text-ink dark:bg-muted/50">
              <PlusIcon className="size-3.5" /> Add item
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
