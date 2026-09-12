"use client";

import { useState } from "react";
import { PlusIcon, Trash2Icon } from "@/components/icons";
import { toast } from "sonner";
import type { PastelColor } from "@tandem/shared";
import { SettingsSection } from "./settings-shell";
import { useWorkspace } from "@/components/workspace-provider";
import { useCreateTag, useDeleteTag, useTags, useUpdateTag } from "@/lib/queries/workspace";
import { ColorSwatches, ColorDot, asPastel } from "@/components/common/pastel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function TagsSettings() {
  const { workspace, canEdit } = useWorkspace();
  const { data: tags } = useTags(workspace.id);
  const create = useCreateTag(workspace.id);
  const update = useUpdateTag(workspace.id);
  const del = useDeleteTag(workspace.id);
  const [name, setName] = useState("");

  return (
    <SettingsSection title="Tags" description="Tags are shared across every space in the workspace.">
      {canEdit ? (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!name.trim()) return;
            try {
              await create.mutateAsync({ name: name.trim(), color: "lavender" });
              setName("");
            } catch {
              toast.error("Couldn't create the tag. It may already exist.");
            }
          }}
          className="mb-4 flex max-w-md items-center gap-2"
        >
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New tag" />
          <Button type="submit" variant="outline" disabled={!name.trim()}>
            <PlusIcon /> Add
          </Button>
        </form>
      ) : null}
      {tags && tags.length === 0 ? <p className="text-[13px] text-ink-3">No tags yet.</p> : null}
      <ul className="flex max-w-md flex-col overflow-hidden rounded-xl bg-surface shadow-card empty:hidden">
        {(tags ?? []).map((t) => (
          <li key={t.id} className="flex items-center gap-2 px-3 py-1.5 hairline-b last:shadow-none">
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" disabled={!canEdit} aria-label="Change color" className="flex size-7 items-center justify-center rounded-md hover:bg-muted">
                  <ColorDot color={t.color} className="size-3" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-3 shadow-float" align="start">
                <ColorSwatches value={asPastel(t.color)} onChange={(c: PastelColor) => update.mutate({ id: t.id, color: c })} />
              </PopoverContent>
            </Popover>
            <Input
              defaultValue={t.name}
              disabled={!canEdit}
              className="h-7 flex-1 border-transparent bg-transparent px-1.5 hover:border-input"
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v && v !== t.name) update.mutate({ id: t.id, name: v });
                else e.target.value = t.name;
              }}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            />
            {canEdit ? (
              <Button variant="ghost" size="icon-xs" className="text-ink-3 hover:text-destructive" aria-label="Delete tag" onClick={() => del.mutate(t.id)}>
                <Trash2Icon />
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
    </SettingsSection>
  );
}
